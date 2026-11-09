import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, LoaderCircle, Search } from "lucide-react";

import { predictiveMaintenanceApi } from "../api/predictiveMaintenanceApi";
import type { PredictiveRiskCategory } from "../types/predictiveMaintenance";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { getApiErrorMessage } from "@/shared/utils/api-error";

const CATEGORY_LABELS: Record<PredictiveRiskCategory, string> = {
    HIGH_PRIORITY: "Schedule overdue",
    INSPECT: "Inspection mentioned",
    MONITOR: "Monitor",
    INSUFFICIENT_DATA: "Insufficient data",
};
const CATEGORY_STYLES: Record<PredictiveRiskCategory, string> = {
    HIGH_PRIORITY: "border-red-400/30 bg-red-500/10 text-red-200",
    INSPECT: "border-amber-400/30 bg-amber-500/10 text-amber-100",
    MONITOR: "border-sky-400/30 bg-sky-500/10 text-sky-100",
    INSUFFICIENT_DATA: "border-white/15 bg-white/[.04] text-white/65",
};

function confidenceDescription(item: { confidence: string; assessment_basis: string; risk_category: PredictiveRiskCategory }): string {
    if (item.assessment_basis === "SCHEDULED_MAINTENANCE") return "saved schedule recorded";
    if (item.risk_category === "INSUFFICIENT_DATA") return "no accepted source evidence";
    return `${item.confidence.toLowerCase()} source/applicability match (not technical accuracy)`;
}

export function PredictiveMaintenancePanel({ vehicleId }: { vehicleId: string }) {
    const queryClient = useQueryClient();
    const controller = useRef<AbortController | null>(null);
    const queryKey = ["predictive-maintenance", vehicleId] as const;
    const cached = useQuery({ queryKey, queryFn: ({ signal }) => predictiveMaintenanceApi.getCached(vehicleId, signal), staleTime: 60_000 });
    const research = useMutation({
        mutationFn: ({ refresh, signal }: { refresh: boolean; signal: AbortSignal }) => predictiveMaintenanceApi.research(vehicleId, refresh, signal),
        onSuccess: (report) => queryClient.setQueryData(queryKey, report),
    });
    useEffect(() => () => controller.current?.abort(), []);
    const runResearch = (refresh: boolean) => {
        if (research.isPending) return;
        const next = new AbortController();
        controller.current = next;
        research.mutate({ refresh, signal: next.signal });
    };
    const report = cached.data ?? null;
    const error = cached.error ?? research.error;

    return (
        <Card className="border-white/10 bg-[#121518] text-white">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                    <h2 className="font-heading text-lg font-semibold">Predictive preventive maintenance</h2>
                    <p className="text-sm text-white/55">Research-based maintenance attention for {report?.vehicle.manufacturer ?? "this vehicle"} {report?.vehicle.model ?? ""}. These are evidence categories, not failure probabilities or a diagnosis.</p>
                </div>
                <Button type="button" onClick={() => runResearch(Boolean(report))} disabled={research.isPending || cached.isLoading}>
                    {research.isPending || cached.isLoading ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}
                    {research.isPending ? "Researching…" : cached.isLoading ? "Checking saved research…" : report ? "Refresh research" : "Research maintenance"}
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                    <p className="text-xs text-white/50">The backend selects up to three components from saved schedules and service history. An absent service record means unknown, not never replaced. Matched excerpts are text matches to search results, not proof of technical accuracy. Source-match confidence describes source and vehicle applicability only. Reports are automated, unreviewed and expire after 24 hours.</p>
                {error && <div role="alert" className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{getApiErrorMessage(error)}</div>}
                {!report && !cached.isLoading && !research.isPending && !error && <p className="rounded-lg border border-dashed border-white/15 p-5 text-sm text-white/60">No saved research report yet. Run research to check for validated, vehicle-matched technical evidence.</p>}
                {report && <>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {(["HIGH_PRIORITY", "INSPECT", "MONITOR", "INSUFFICIENT_DATA"] as const).map((category) => {
                            const key = category === "HIGH_PRIORITY" ? "high_priority_count" : category === "INSPECT" ? "inspect_count" : category === "MONITOR" ? "monitor_count" : "insufficient_data_count";
                            return <div key={category} className={`rounded-lg border p-3 ${CATEGORY_STYLES[category]}`}><div className="text-xs">{CATEGORY_LABELS[category]}</div><div className="mt-1 text-xl font-semibold">{report.overview[key]}</div></div>;
                        })}
                    </div>
                    <p className="text-xs text-white/50"><span className="text-white/70">{research.isSuccess ? "New report generated and saved" : "Saved research report"}</span> · researched {new Date(report.generated_at).toLocaleString()} · {report.current_mileage_km.toLocaleString()} km · {report.vehicle_age_years} years old · model {report.knowledge_model_version} / schema {report.research_schema_version}</p>
                    {report.recommendations.length === 0 && <p className="text-sm text-white/60">No candidate components were available from the saved data.</p>}
                    <div className="space-y-3">
                        {report.recommendations.map((item) => <details key={item.candidate_key} className="group rounded-xl border border-white/10 bg-white/[.025]">
                            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
                                <div><h3 className="font-medium">{item.component}</h3><p className="mt-1 text-xs text-white/50">{item.component_category} · {confidenceDescription(item)}</p></div>
                                <span className={`rounded-full border px-3 py-1 text-xs ${CATEGORY_STYLES[item.risk_category]}`}>{CATEGORY_LABELS[item.risk_category]}</span>
                            </summary>
                            <div className="space-y-3 border-t border-white/10 p-4 text-sm">
                                <p><span className="text-white/50">Why selected: </span>{item.why_selected}</p>
                                <p><span className="text-white/50">Vehicle context: </span>{item.vehicle_context}</p>
                                <p><span className="text-white/50">Saved schedule: </span>{item.schedule_status.toLowerCase()}</p>
                                {item.documented_concern && <p><span className="text-white/50">Documented concern: </span>{item.documented_concern}</p>}
                                {item.evidence_summary && <p><span className="text-white/50">Evidence: </span>{item.evidence_summary}</p>}
                                {item.matched_excerpts.length > 0 && <div className="space-y-2"><h4 className="text-xs font-semibold uppercase tracking-wide text-white/45">Source-matched excerpts</h4>{item.matched_excerpts.map((quote) => <blockquote key={`${quote.source_url}:${quote.quote}`} className="border-l-2 border-red-400/60 pl-3 text-sm text-white/70">“{quote.quote}”<a className="ml-2 inline-flex items-center gap-1 text-xs text-red-200 underline-offset-4 hover:underline" href={quote.source_url} target="_blank" rel="noopener noreferrer">Open source<ExternalLink className="size-3" aria-hidden="true" /></a></blockquote>)}</div>}
                                <p><span className="text-white/50">Next step: </span>{item.recommendation}</p>
                                {item.recorded_maintenance.length > 0 && <div><h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/45">Recorded maintenance</h4><ul className="space-y-1 text-xs text-white/70">{item.recorded_maintenance.map((record) => <li key={record.reference}>{record.service_date}{record.mileage_at_service !== null ? ` · ${record.mileage_at_service.toLocaleString()} km` : ""} · {record.type}{record.description ? ` · ${record.description}` : ""}{record.next_due_date || record.next_due_mileage !== null ? ` · Next due ${record.next_due_date ?? ""}${record.next_due_mileage !== null ? ` ${record.next_due_mileage.toLocaleString()} km` : ""}` : ""}</li>)}</ul></div>}
                                {item.data_gaps.length > 0 && <div><h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/45">Information gaps</h4><ul className="list-inside list-disc text-xs text-white/65">{item.data_gaps.map((gap) => <li key={gap}>{gap}</li>)}</ul></div>}
                                {item.sources.length > 0 && <div className="border-t border-white/10 pt-3"><h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/45">Allowed source links (technical accuracy not independently verified)</h4><ul className="space-y-2">{item.sources.map((source) => <li key={source.url}><a className="inline-flex items-center gap-1 text-sm text-red-200 underline-offset-4 hover:underline" href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<ExternalLink className="size-3" aria-hidden="true" /></a><span className="ml-2 text-xs text-white/40">{source.domain} · {source.quality.toLowerCase()} source</span></li>)}</ul></div>}
                                <p className="text-[11px] text-white/40">{item.assessment_basis.replaceAll("_", " ")} · assessed {new Date(item.last_researched_at).toLocaleString()}</p>
                            </div>
                        </details>)}
                    </div>
                </>}
            </CardContent>
        </Card>
    );
}
