import asyncio
import hashlib
import json
import math
import re
from datetime import date, datetime, timezone, timedelta
from urllib.parse import urlparse

from app.ai.predictive_schemas import (
    PredictiveAssessmentBasis,
    PredictiveCandidate,
    PredictiveEvidenceConfidence,
    PredictiveKnowledgeEntry,
    PredictiveMaintenanceOverview,
    PredictiveMaintenanceRecord,
    PredictiveMaintenanceReport,
    PredictiveRecommendation,
    PredictiveResearchDraft,
    PredictiveRiskCategory,
    PredictiveSourceQuality,
    PredictiveSourceReference,
)
from app.ai.research.factory import get_research_provider
from app.ai.research.source_validator import SourceValidator
from app.ai.schemas import MaintenanceResearchResult, VehicleConversationContext
from app.ai.search.factory import get_maintenance_search_provider
from app.ai.search.schemas import SearchResult
from app.repositories.maintenance_knowledge_repository import MaintenanceKnowledgeRepository
from app.schemas.maintenance import MaintenanceType


class PredictiveResearchCooldownError(Exception):
    def __init__(self, retry_after_seconds: int):
        self.retry_after_seconds = retry_after_seconds
        super().__init__("Predictive maintenance research is temporarily rate limited.")


class PredictiveMaintenanceService:
    KNOWLEDGE_MODEL_VERSION = "predictive-maintenance-v1.1"
    RESEARCH_SCHEMA_VERSION = 2
    KNOWLEDGE_REVISION = 2
    CACHE_TTL_SECONDS = 24 * 60 * 60
    TOTAL_TIMEOUT_SECONDS = 110
    COMPONENT_GROUPS = (
        ("engine_lubrication", "Engine and lubrication", "Engine oil and lubrication", {"ENGINE_OIL", "OIL_FILTER"}),
        ("cooling_system", "Cooling system", "Coolant and cooling system", {"COOLANT"}),
        ("braking_system", "Braking system", "Brake service and fluid", {"BRAKE_SERVICE", "BRAKE_FLUID"}),
        ("transmission", "Transmission", "Transmission service", {"TRANSMISSION"}),
        ("battery_charging", "Battery and charging", "Battery and charging system", {"BATTERY"}),
        ("tyres_steering", "Tyres and steering", "Tyres, alignment and steering", {"TYRE", "ALIGNMENT"}),
        ("ignition", "Ignition system", "Spark plugs and ignition", {"SPARK_PLUG"}),
        ("belts", "Belts and auxiliary components", "Timing belt and auxiliary drive", {"TIMING_BELT"}),
        ("air_filters", "Air filtration", "Air and cabin filters", {"AIR_FILTER", "CABIN_FILTER"}),
    )

    def __init__(self, repository=None, search_provider=None, research_provider=None, clock=None):
        self.repository = repository or MaintenanceKnowledgeRepository()
        self.search_provider = search_provider
        self.research_provider = research_provider
        self.validator = SourceValidator()
        self.clock = clock or (lambda: datetime.now(timezone.utc))

    async def get_cached_report(self, user_id: str, vehicle_id: str, context: VehicleConversationContext):
        key = self.cache_key(user_id, vehicle_id, context)
        cached = await self.repository.get_valid_profile(key, self.clock(), self.RESEARCH_SCHEMA_VERSION)
        if cached is None:
            return None
        try:
            return PredictiveMaintenanceReport.model_validate(cached["profile"])
        except (KeyError, TypeError, ValueError):
            return None

    async def research(self, user_id: str, vehicle_id: str, context: VehicleConversationContext, refresh=False):
        cache_key = self.cache_key(user_id, vehicle_id, context)
        if not refresh:
            cached = await self.get_cached_report(user_id, vehicle_id, context)
            if cached is not None:
                return cached

        async def run():
            now = self.clock()
            cooldown = await self.repository.acquire_research_cooldown(
                user_id, vehicle_id, now, timedelta(seconds=60)
            )
            if cooldown is not None:
                raise PredictiveResearchCooldownError(max(1, math.ceil((cooldown - now).total_seconds())))
            return await self._research_and_cache(user_id, vehicle_id, context, cache_key)

        return await asyncio.wait_for(run(), self.TOTAL_TIMEOUT_SECONDS)

    async def _research_and_cache(self, user_id, vehicle_id, context, cache_key):
        generated_at = self.clock()
        candidates = self.generate_candidates(context, generated_at.date())
        if not candidates:
            return self._make_report(vehicle_id, context, candidates, {}, generated_at)

        search = self.search_provider or get_maintenance_search_provider()
        provider = self.research_provider or get_research_provider()
        queries = {candidate.key: self._query(context, candidate) for candidate in candidates}
        results_by_candidate: dict[str, list[SearchResult]] = {}
        tasks = [search.search_questions(context.vehicle.identity, [query]) for query in queries.values()]
        outcomes = await asyncio.gather(*tasks, return_exceptions=True)
        all_results: list[SearchResult] = []
        for candidate, outcome in zip(candidates, outcomes):
            if not isinstance(outcome, BaseException):
                bounded = outcome[:10]
                results_by_candidate[candidate.key] = bounded
                all_results.extend(bounded)

        deduplicated = {}
        for result in all_results:
            key = str(result.url)
            if key not in deduplicated or (result.score or 0) > (deduplicated[key].score or 0):
                deduplicated[key] = result
        all_results = sorted(deduplicated.values(), key=lambda result: result.score or 0, reverse=True)[:10]

        draft = PredictiveResearchDraft(analyses=[], sources=[])
        if all_results:
            context_vehicle = {
                "manufacturer": context.vehicle.manufacturer,
                "model": context.vehicle.model,
                "generation": context.vehicle.identity.generation,
                "variant": context.vehicle.variant,
                "year": context.vehicle.year,
                "engine": context.vehicle.engine,
                "transmission": context.vehicle.transmission,
                "fuel_type": context.vehicle.fuel_type,
                "current_mileage_km": context.vehicle.current_mileage,
                "vehicle_age_years": max(0, generated_at.year - context.vehicle.year),
            }
            draft = await provider.analyze_predictive_maintenance(
                context.vehicle.identity, context_vehicle, candidates, all_results[:10]
            )
        report = self._make_report(vehicle_id, context, candidates, self._validated_analyses(context, draft, candidates, results_by_candidate), generated_at)
        await self.repository.save_profile(
            cache_key=cache_key,
            profile=report.model_dump(mode="json"),
            expires_at=self.clock() + timedelta(seconds=self.CACHE_TTL_SECONDS),
            schema_version=self.RESEARCH_SCHEMA_VERSION,
        )
        return report

    @classmethod
    def generate_candidates(cls, context: VehicleConversationContext, today: date | None = None) -> list[PredictiveCandidate]:
        today = today or date.today()
        mileage = context.vehicle.current_mileage
        groups = []
        for key, category, component, types in cls.COMPONENT_GROUPS:
            records = [record for record in context.maintenance_records if record.type in types]
            records.sort(key=lambda item: (item.service_date, item.mileage_at_service or -1), reverse=True)
            latest_per_type = {}
            for record in records:
                latest_per_type.setdefault(record.type, record)
            statuses = []
            for latest in latest_per_type.values():
                if not (latest.next_due_date or latest.next_due_mileage is not None):
                    continue
                try:
                    maintenance_type = MaintenanceType(latest.type)
                    calculated = cls._schedule_status(maintenance_type, latest, mileage, today)
                    if calculated:
                        statuses.append(calculated.value)
                except ValueError:
                    continue
            status = "OVERDUE" if "OVERDUE" in statuses else "UPCOMING" if "UPCOMING" in statuses else "UNKNOWN"
            reason = (
                "A recorded maintenance schedule is overdue." if status == "OVERDUE" else
                "A recorded maintenance schedule is upcoming." if status == "UPCOMING" else
                "Saved service history includes this component." if records else
                "General vehicle-specific evidence lookup; available history does not show this component, which does not establish whether it was serviced."
            )
            gap = [] if records else ["No matching service record is available; replacement history is unknown."]
            basis = "RECORDED_SCHEDULE" if status in {"OVERDUE", "UPCOMING"} else "SERVICE_HISTORY" if records else "GENERAL_LOOKUP"
            groups.append((0 if status == "OVERDUE" else 1 if status == "UPCOMING" else 2 if records else 3, -len(records), key, PredictiveCandidate(
                key=key,
                component_category=category,
                component=component,
                related_maintenance_types=sorted(types),
                selection_reason=reason,
                selection_basis=basis,
                vehicle_context=f"{context.vehicle.manufacturer} {context.vehicle.model} {context.vehicle.year}; {context.vehicle.variant or 'variant unknown'}; engine {context.vehicle.engine or 'unknown'}; {mileage:,} km; age {max(0, today.year-context.vehicle.year)} years",
                schedule_status=status,
                maintenance_history=[PredictiveMaintenanceRecord.model_validate(item.model_dump()) for item in records[:5]],
                data_gaps=gap,
                evidence_needed=["Vehicle applicability for the recorded make/model/year", "A traceable technical source relevant to this component"],
            )))
        groups.sort(key=lambda entry: entry[:3])
        candidates = [entry[3] for entry in groups]
        selected: list[PredictiveCandidate] = []

        # Reserve one slot for schedule urgency; component history and general
        # research retain the other slots so several overdue schedules cannot
        # consume the complete predictive-research budget.
        overdue = [item for item in candidates if item.schedule_status == "OVERDUE"]
        upcoming = [item for item in candidates if item.schedule_status == "UPCOMING"]
        schedule_candidate = overdue[0] if overdue else (upcoming[0] if upcoming else None)
        if schedule_candidate:
            selected.append(schedule_candidate)

        history_candidates = [
            item for item in candidates
            if item not in selected and item.maintenance_history and item.schedule_status != "OVERDUE"
        ]
        history_candidates.sort(key=lambda item: (
            item.maintenance_history[0].service_date,
            item.maintenance_history[0].mileage_at_service or -1,
            item.key,
        ), reverse=True)
        for item in history_candidates:
            if len(selected) == 3:
                break
            selected.append(item)

        general_candidates = [
            item for item in candidates
            if item not in selected and not item.maintenance_history and item.schedule_status == "UNKNOWN"
        ]
        for item in general_candidates:
            if len(selected) == 3:
                break
            selected.append(item)

        for item in upcoming:
            if len(selected) == 3:
                break
            if item not in selected:
                selected.append(item)
        return selected

    @staticmethod
    def _schedule_status(maintenance_type, record, mileage, today):
        # Reuse the application's existing schedule rules; no score logic is changed.
        from app.services.maintenance_status import calculate_maintenance_status
        return calculate_maintenance_status(maintenance_type, record.next_due_date, record.next_due_mileage, mileage, today)

    @staticmethod
    def _query(context, candidate):
        v = context.vehicle
        identity = " ".join(str(x) for x in (v.year, v.manufacturer, v.model, context.vehicle.identity.generation, v.variant, v.engine, v.transmission) if x)
        return f"{identity} {candidate.component} maintenance inspection technical guidance"[:300]

    def _validated_analyses(self, context, draft, candidates, results_by_candidate):
        candidate_map = {item.key: item for item in candidates}
        result_map = {str(result.url): result for results in results_by_candidate.values() for result in results}
        source_map = {}
        for source in draft.sources:
            if source.url not in result_map:
                continue
            if not self._search_text_supports_match(
                result_map[source.url], context.vehicle.identity, source.vehicle_match,
            ):
                continue
            normalized = self.validator.validate(context.vehicle.identity, MaintenanceResearchResult(guidance=[], sources=[source]))
            if normalized.sources:
                # Source metadata is copied from the exact search result, never model output.
                accepted = normalized.sources[0]
                search_result = result_map[source.url]
                accepted.name = urlparse(str(search_result.url)).hostname or "Source"
                accepted.title = search_result.title[:300]
                accepted.publication_date = search_result.published_date
                source_map[source.url] = normalized.sources[0]
        analyses = {}
        seen = set()
        for item in draft.analyses:
            if item.candidate_key not in candidate_map or item.candidate_key in seen:
                continue
            seen.add(item.candidate_key)
            valid_urls = {str(r.url) for r in results_by_candidate.get(item.candidate_key, [])}
            excerpt_matched_urls = set()
            for quote in item.evidence_quotes:
                source_url = quote.source_url
                result = result_map.get(source_url)
                if source_url in valid_urls and result and result.content and quote.quote.strip() in result.content:
                    excerpt_matched_urls.add(source_url)
            urls = [url for url in item.source_urls if url in valid_urls and url in source_map and url in excerpt_matched_urls]
            # Candidate-specific links and exact source text must both verify before any claim is surfaced.
            if not urls:
                continue
            item.source_urls = urls
            item.evidence_quotes = [quote for quote in item.evidence_quotes if quote.source_url in urls]
            analyses[item.candidate_key] = (item, [source_map[url] for url in urls])
        return analyses

    @classmethod
    def _search_text_supports_match(cls, result, identity, match) -> bool:
        if match is None:
            return False
        text = f"{result.title or ''} {result.content or ''}"
        for value in (identity.manufacturer, identity.model):
            if not cls._contains_phrase(text, value):
                return False
        for value in (match.variant, match.transmission, match.engine, match.generation):
            if value and not cls._contains_phrase(text, value):
                return False
        for year in (match.year_from, match.year_to):
            if year is not None and str(year) not in text:
                return False
        # If the result itself names an engine code, do not let a model omit
        # the match field and thereby pass text about a different engine.
        source_codes = {re.sub(r"[^a-z0-9]", "", code.casefold()) for code in re.findall(r"\b\d+[A-Z]{1,3}-?[A-Z]{1,3}\b", text, re.I)}
        if identity.engine:
            vehicle_codes = {re.sub(r"[^a-z0-9]", "", code.casefold()) for code in re.findall(r"\b\d+[A-Z]{1,3}-?[A-Z]{1,3}\b", identity.engine, re.I)}
            if source_codes and vehicle_codes and not source_codes.intersection(vehicle_codes):
                return False
        if identity.generation:
            source_generations = set(re.findall(r"\b(?:G|Gen(?:eration)?\s*)\d+\b", text, re.I))
            if source_generations and not any(cls._contains_phrase(value, identity.generation) for value in source_generations):
                return False
        return True

    @staticmethod
    def _contains_phrase(text: str, value: str) -> bool:
        return bool(re.search(r"(?<![a-z0-9])" + re.escape(value.strip()) + r"(?![a-z0-9])", text, re.I))

    def _make_report(self, vehicle_id, context, candidates, analyses, generated_at):
        recommendations = []
        for candidate in candidates:
            analysis, sources = analyses.get(candidate.key, (None, []))
            is_overdue = candidate.schedule_status == "OVERDUE"
            if is_overdue:
                risk = PredictiveRiskCategory.HIGH_PRIORITY
                basis = PredictiveAssessmentBasis.SCHEDULED_MAINTENANCE
                recommendation = "Follow up on the overdue maintenance schedule recorded in SmartDrive. This status describes the saved schedule, not the component's physical condition."
                confidence = PredictiveEvidenceConfidence.HIGH
            elif candidate.schedule_status == "UPCOMING":
                risk = PredictiveRiskCategory.MONITOR
                basis = PredictiveAssessmentBasis.SCHEDULED_MAINTENANCE
                recommendation = "Monitor the upcoming maintenance schedule recorded in SmartDrive and follow its entered due date or mileage. This is a schedule reminder, not an assessment of physical condition."
                confidence = PredictiveEvidenceConfidence.HIGH
            elif analysis and sources:
                # A text match cannot establish technical accuracy or that an
                # inspection is appropriate, so the automated system stays at
                # Monitor until evidence receives an independent review.
                risk = PredictiveRiskCategory.MONITOR
                basis = PredictiveAssessmentBasis.GENERAL_PREVENTIVE
                recommendation = "A source-matched excerpt is available. Review the full source with a qualified technician; SmartDrive has not independently verified its technical accuracy or applicability."
                confidence = self._confidence(sources, context.vehicle.identity)
            else:
                risk = PredictiveRiskCategory.INSUFFICIENT_DATA
                basis = PredictiveAssessmentBasis.INSUFFICIENT_EVIDENCE
                recommendation = "There is not enough validated, vehicle-matched evidence to recommend component-specific action. Confirm the service history or consult a qualified technician."
                confidence = PredictiveEvidenceConfidence.NONE
            references = [PredictiveSourceReference(
                name=source.name, title=source.title or source.name, url=source.url,
                domain=urlparse(source.url).hostname or "", source_type=source.source_type,
                quality=PredictiveSourceQuality.MANUFACTURER if source.source_type.value == "MANUFACTURER" else PredictiveSourceQuality.SPECIALIST,
                publication_date=source.publication_date, retrieved_at=generated_at,
            ) for source in sources]
            matched_excerpt_summary = "A text-matched excerpt from an allowed source is available; this is not an independent technical accuracy check."
            entry = None
            if analysis and references:
                entry = PredictiveKnowledgeEntry(
                    entry_id=hashlib.sha256(f"{self.KNOWLEDGE_MODEL_VERSION}:{vehicle_id}:{candidate.key}:{generated_at.isoformat()}".encode()).hexdigest()[:32],
                    vehicle_applicability={"manufacturer": context.vehicle.manufacturer, "model": context.vehicle.model, "year": context.vehicle.year, "variant": context.vehicle.variant, "engine": context.vehicle.engine, "transmission": context.vehicle.transmission},
                    component_category=candidate.component_category, component=candidate.component,
                    documented_concern=None, recommendation=None,
                    # Applicability bounds from model output are not stored unless verified against a
                    # structured source/manual; free-form snippets are insufficient to establish intervals.
                    mileage_applicability=None,
                    age_applicability=None,
                    evidence_summary=matched_excerpt_summary,
                    matched_excerpts=analysis.evidence_quotes,
                    sources=references, confidence=confidence, evidence_retrieved_at=generated_at,
                )
            recommendations.append(PredictiveRecommendation(
                candidate_key=candidate.key, component_category=candidate.component_category, component=candidate.component,
                risk_category=risk, assessment_basis=basis, why_selected=candidate.selection_reason,
                vehicle_context=candidate.vehicle_context, schedule_status=candidate.schedule_status,
                recorded_maintenance=candidate.maintenance_history, data_gaps=candidate.data_gaps,
                documented_concern=None,
                evidence_summary=matched_excerpt_summary if analysis and references else None,
                matched_excerpts=analysis.evidence_quotes if analysis and references else [],
                recommendation=recommendation, confidence=confidence, sources=references, knowledge_entry=entry,
                last_researched_at=generated_at,
            ))
        counts = {kind: sum(x.risk_category == kind for x in recommendations) for kind in PredictiveRiskCategory}
        return PredictiveMaintenanceReport(
            vehicle_id=vehicle_id, vehicle=context.vehicle.identity, vehicle_age_years=max(0, generated_at.year-context.vehicle.year),
            current_mileage_km=context.vehicle.current_mileage, knowledge_model_version=self.KNOWLEDGE_MODEL_VERSION,
            research_schema_version=self.RESEARCH_SCHEMA_VERSION, knowledge_revision=self.KNOWLEDGE_REVISION,
            generated_at=generated_at, overview=PredictiveMaintenanceOverview(
                high_priority_count=counts[PredictiveRiskCategory.HIGH_PRIORITY], inspect_count=counts[PredictiveRiskCategory.INSPECT],
                monitor_count=counts[PredictiveRiskCategory.MONITOR], insufficient_data_count=counts[PredictiveRiskCategory.INSUFFICIENT_DATA],
                last_researched_at=generated_at,
            ), recommendations=recommendations,
        )

    @staticmethod
    def _confidence(sources, identity):
        year_specific_manufacturer = any(
            source.source_type.value == "MANUFACTURER"
            and identity.year is not None
            and source.vehicle_match is not None
            and (source.vehicle_match.year_from is not None or source.vehicle_match.year_to is not None)
            and (source.vehicle_match.year_from is None or identity.year >= source.vehicle_match.year_from)
            and (source.vehicle_match.year_to is None or identity.year <= source.vehicle_match.year_to)
            and (not identity.engine or (source.vehicle_match.engine and PredictiveMaintenanceService._same_engine(source.vehicle_match.engine, identity.engine)))
            and (not identity.generation or (source.vehicle_match.generation and source.vehicle_match.generation.strip().casefold() == identity.generation.strip().casefold()))
            for source in sources
        )
        if year_specific_manufacturer:
            return PredictiveEvidenceConfidence.HIGH
        if len(sources) >= 2:
            return PredictiveEvidenceConfidence.MODERATE
        return PredictiveEvidenceConfidence.LOW

    @staticmethod
    def _same_engine(source_engine: str, vehicle_engine: str) -> bool:
        normalize = lambda value: re.sub(r"[^a-z0-9]", "", value.casefold())
        source, vehicle = normalize(source_engine), normalize(vehicle_engine)
        if not source or not vehicle:
            return False
        code_pattern = re.compile(r"\b\d+[A-Z]{1,3}-?[A-Z]{1,3}\b", re.I)
        source_codes = {normalize(code) for code in code_pattern.findall(source_engine)}
        vehicle_codes = {normalize(code) for code in code_pattern.findall(vehicle_engine)}
        if source_codes:
            return bool(vehicle_codes and source_codes.intersection(vehicle_codes))
        return source == vehicle

    @classmethod
    def cache_key(cls, user_id, vehicle_id, context):
        value = {
            "user_id": user_id, "vehicle_id": vehicle_id,
            "knowledge_model_version": cls.KNOWLEDGE_MODEL_VERSION,
            "research_schema_version": cls.RESEARCH_SCHEMA_VERSION,
            "knowledge_revision": cls.KNOWLEDGE_REVISION,
            "identity": context.vehicle.identity.model_dump(mode="json"),
            "engine": context.vehicle.engine, "mileage": context.vehicle.current_mileage,
            "fuel_type": context.vehicle.fuel_type,
            "as_of_date": date.today().isoformat(),
            "history": [record.model_dump(mode="json") for record in context.maintenance_records],
        }
        payload = json.dumps(value, sort_keys=True, default=str, separators=(",", ":"))
        return hashlib.sha256(("predictive:" + payload).encode()).hexdigest()
