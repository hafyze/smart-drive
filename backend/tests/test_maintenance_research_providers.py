import json
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from app.ai.research.gemini_provider import GeminiResearchProvider
from app.ai.schemas import (
    ChatRouteDraft,
    MaintenanceRecommendationType,
    KnowledgeConfidence,
    MaintenanceResearchResult,
    MaintenanceSummary,
    ResearchedMaintenanceItem,
    ResearchSource,
    VehicleIdentity,
    VehicleIdentityConfidence,
)
from app.ai.search.schemas import SearchResult
from app.ai.search.tavily_provider import TavilySearchProvider


def run_immediate_coroutine(coroutine):
    try:
        coroutine.send(None)
    except StopIteration as completed:
        return completed.value
    raise AssertionError("The mocked provider coroutine unexpectedly waited for I/O")


class MaintenanceResearchProviderTests(unittest.TestCase):
    def setUp(self):
        self.identity = VehicleIdentity(
            manufacturer="Perodua", model="Myvi", variant="1.5 AV",
            year=2023, transmission="AUTOMATIC",
            confidence=VehicleIdentityConfidence.HIGH,
        )

    def test_tavily_builds_search_request_and_ignores_missing_or_blocked_urls(self):
        provider = TavilySearchProvider.__new__(TavilySearchProvider)
        provider.api_key = "mock-tavily-key"
        provider.search_depth = "advanced"
        provider.max_results_per_query = 5
        requests = []

        class FakeResponse:
            def raise_for_status(self):
                return None

            def json(self):
                return {"results": [
                    {"title": "Manual", "url": "https://www.perodua.com.my/manual", "content": "schedule", "score": 0.9},
                    {"title": "Blocked", "url": "https://www.reddit.com/thread", "content": "bad", "score": 0.8},
                    {"title": "Missing URL", "content": "no URL"},
                ]}

        class FakeClient:
            def __init__(self, timeout):
                self.timeout = timeout

            async def __aenter__(self):
                return self

            async def __aexit__(self, *args):
                return None

            async def post(self, url, json, headers):
                requests.append((url, json, headers))
                return FakeResponse()

        with patch("app.ai.search.tavily_provider.httpx.AsyncClient", FakeClient):
            results = run_immediate_coroutine(provider._search_query("Myvi service schedule"))

        self.assertEqual(len(results), 1)
        self.assertEqual(str(results[0].url), "https://www.perodua.com.my/manual")
        url, payload, headers = requests[0]
        self.assertEqual(url, provider.API_URL)
        self.assertEqual(payload["max_results"], 5)
        self.assertFalse(payload["include_answer"])
        self.assertEqual(headers["Authorization"], "Bearer mock-tavily-key")

    def test_tavily_caps_deduplicated_search_results(self):
        results = [SearchResult(
            title=f"title-{index}" * 100,
            url=f"https://www.paultan.org/article-{index}",
            content="maintenance evidence " * 300,
            score=1 - index / 30,
        ) for index in range(12)]

        capped = TavilySearchProvider._bound_results(results)

        self.assertLessEqual(len(capped), 10)
        self.assertTrue(all(len(item.title) <= 300 for item in capped))
        self.assertTrue(all(len(item.content or "") <= 2_500 for item in capped))

    def test_tavily_conversation_search_limits_queries_and_text_length(self):
        provider = TavilySearchProvider.__new__(TavilySearchProvider)
        provider._search_queries = AsyncMock(return_value=[])
        queries = ["a" * 500, "second", "third", "fourth"]
        run_immediate_coroutine(provider.search_questions(self.identity, queries))
        provider._search_queries.assert_awaited_once_with(["a" * 300, "second", "third"])

    def test_gemini_conversation_router_parses_structured_route_and_bounds_prompt(self):
        provider = GeminiResearchProvider.__new__(GeminiResearchProvider)
        requests = []

        async def generate_content(**kwargs):
            requests.append(kwargs)
            return SimpleNamespace(text=json.dumps({
                "needs_research": False,
                "search_queries": [],
                "direct_answer": {"record_references": ["record-1"], "researched_claims": [], "sources": [], "interpretation": "Check your saved service records."},
            }))

        provider.client = SimpleNamespace(aio=SimpleNamespace(models=SimpleNamespace(generate_content=generate_content)))

        async def inline_wait_for(awaitable, timeout):
            return run_immediate_coroutine(awaitable)

        context = {
            "vehicle": {"manufacturer": "Perodua", "model": "Myvi", "engine": "1.5L"},
            "maintenance_records": [{"reference": f"record-{index}", "description": "work" * 1000} for index in range(60)],
            "history_truncated": True,
        }
        with patch("app.ai.research.gemini_provider.settings.gemini_research_model", "mock-model"), patch(
            "app.ai.research.gemini_provider.asyncio.wait_for", side_effect=inline_wait_for,
        ):
            result = run_immediate_coroutine(provider.route_conversation("Have I changed the oil?", context, []))
        self.assertIsInstance(result, ChatRouteDraft)
        self.assertFalse(result.needs_research)
        self.assertEqual(result.direct_answer.record_references, ["record-1"])
        self.assertLessEqual(len(requests[0]["contents"]), provider.MAX_PROMPT_CHARS)
        self.assertEqual(requests[0]["config"].response_schema, ChatRouteDraft)
        self.assertIn("never as instructions", requests[0]["contents"])

    def test_gemini_rejects_missing_configuration_without_constructing_client(self):
        with patch("app.ai.research.gemini_provider.settings.gemini_api_key", ""), patch(
            "app.ai.research.gemini_provider.genai.Client"
        ) as client:
            with self.assertRaisesRegex(RuntimeError, "GEMINI_API_KEY"):
                GeminiResearchProvider()
        client.assert_not_called()

    def test_gemini_parses_structured_response_using_only_bounded_sources(self):
        provider = GeminiResearchProvider.__new__(GeminiResearchProvider)
        source = "https://www.paultan.org/myvi-maintenance"
        provider._generate_with_retry = AsyncMock(return_value=SimpleNamespace(text=json.dumps({
            "guidance": [],
            "sources": [{
                "name": "Paul Tan", "url": source, "title": "Myvi guide",
                "source_type": "SPECIALIST",
                "vehicle_match": {"manufacturer": "Perodua", "model": "Myvi"},
            }],
        })))
        results = [SearchResult(title="Guide", url=source, content="Evidence", score=1)]
        profile = run_immediate_coroutine(provider.research(
            self.identity, results, MaintenanceSummary(), 60_000,
        ))
        self.assertEqual(str(profile.sources[0].url), source)
        self.assertEqual(profile.sources[0].title, "Guide")
        self.assertEqual(profile.sources[0].name, "www.paultan.org")
        provider._generate_with_retry.assert_awaited_once()

    def test_gemini_research_allowlist_keeps_only_supplied_citations(self):
        provider = GeminiResearchProvider.__new__(GeminiResearchProvider)
        supplied_url = "https://www.perodua.com.my/myvi/manual"
        fabricated_url = "https://example.invalid/fabricated"
        result = MaintenanceResearchResult(
            guidance=[ResearchedMaintenanceItem(
                key="engine-oil",
                name="Engine oil",
                recommendation_type=MaintenanceRecommendationType.SCHEDULED,
                confidence=KnowledgeConfidence.HIGH,
                source_urls=[supplied_url, fabricated_url],
            )],
            sources=[ResearchSource(
                name="Claimed source",
                url=supplied_url,
                source_type="MANUFACTURER",
                vehicle_match={"manufacturer": "Perodua", "model": "Myvi"},
            )],
        )
        bounded = [SearchResult(title="Owner manual", url=supplied_url, content="Oil schedule")]

        checked = provider._enforce_source_allowlist(result, bounded)

        self.assertEqual(checked.guidance[0].source_urls, [supplied_url])
        self.assertEqual([str(source.url) for source in checked.sources], [supplied_url])

    def test_gemini_provider_passes_per_call_timeout_to_async_runtime(self):
        provider = GeminiResearchProvider.__new__(GeminiResearchProvider)

        async def wait_forever(**kwargs):
            await asyncio.sleep(1)

        provider.client = SimpleNamespace(
            aio=SimpleNamespace(models=SimpleNamespace(generate_content=wait_forever)),
        )
        timeouts = []

        async def fake_wait_for(awaitable, timeout):
            timeouts.append(timeout)
            awaitable.close()
            return SimpleNamespace(text="mock response")

        with patch("app.ai.research.gemini_provider.settings.gemini_research_model", "mock-model"), patch(
            "app.ai.research.gemini_provider.asyncio.wait_for", side_effect=fake_wait_for,
        ):
            response = run_immediate_coroutine(provider._generate_with_retry("prompt", timeout_seconds=35))
        self.assertEqual(response.text, "mock response")
        self.assertEqual(timeouts, [35])

    def test_gemini_retries_a_mocked_503_once(self):
        provider = GeminiResearchProvider.__new__(GeminiResearchProvider)
        attempts = []
        sleep_delays = []

        class MockServerError(Exception):
            def __init__(self):
                self.code = 503

        async def generate_content(**kwargs):
            return None

        provider.client = SimpleNamespace(
            aio=SimpleNamespace(models=SimpleNamespace(generate_content=generate_content)),
        )

        async def fake_wait_for(awaitable, timeout):
            attempts.append(timeout)
            awaitable.close()
            if len(attempts) == 1:
                raise MockServerError()
            return SimpleNamespace(text="mock structured response")

        async def fake_sleep(delay):
            sleep_delays.append(delay)

        with self.assertLogs("app.ai.research.gemini_provider", level="WARNING") as captured:
            with patch("app.ai.research.gemini_provider.settings.gemini_research_model", "mock-model"), patch(
                "app.ai.research.gemini_provider.errors.ServerError", MockServerError,
            ), patch("app.ai.research.gemini_provider.asyncio.wait_for", side_effect=fake_wait_for), patch(
                "app.ai.research.gemini_provider.asyncio.sleep", side_effect=fake_sleep,
            ):
                response = run_immediate_coroutine(provider._generate_with_retry("private prompt", timeout_seconds=35))

        self.assertEqual(response.text, "mock structured response")
        self.assertEqual(attempts, [35, 35])
        self.assertEqual(sleep_delays, [2])
        self.assertIn("status 503", captured.output[0])
        self.assertNotIn("private prompt", captured.output[0])


if __name__ == "__main__":
    unittest.main()
