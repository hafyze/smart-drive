import asyncio
import logging
import os
from typing import Any

import httpx

from app.ai.schemas import VehicleIdentity
from app.ai.search.base import MaintenanceSearchProvider
from app.ai.search.schemas import SearchResult

logger = logging.getLogger(__name__)

class TavilySearchProvider(MaintenanceSearchProvider):
    API_URL = "https://api.tavily.com/search"

    def __init__(self) -> None:
        self.api_key = os.getenv("TAVILY_API_KEY")

        if not self.api_key:
            raise RuntimeError("TAVILY_API_KEY is not configured.")

        self.max_results_per_query = int(
            os.getenv("TAVILY_MAX_RESULTS", 5)
        )

        self.search_depth = os.getenv(
            "TAVILY_SEARCH_DEPTH",
            "advanced"
        )

    async def search(self, identity: VehicleIdentity) -> list[SearchResult]:
        queries = self._build_queries(identity)

        tasks = [
            self._search_query(query)
            for query in queries
        ]

        query_results = await asyncio.gather(
            *tasks,
            return_exceptions=True,
        )

        results: list[SearchResult] = []

        for query, result in zip(queries, query_results):
            if isinstance(result, BaseException):
                logger.warning(
                    "Tavily search failed for query '%s': %s ", query, result,
                )
                continue

            results.extend(result)
        return self._deduplicate_results(results)

    def _build_queries(self, identity: VehicleIdentity) -> list[str]:
        manufacturer = identity.manufacturer
        model = identity.model
        variant = identity.variant or ""
        year = identity.year
        transmission = identity.transmission or ""

        full_vehicle = " ".join(
            str(value)
            for value in [
                year,
                manufacturer,
                model,
                variant,
                transmission,
            ]
            if value
        )

        base_vehicle = " ".join(
            str(value)
            for value in [year, manufacturer, model]
            if value
        )

        return [
            f"{full_vehicle} maintenance schedule",
            f"{base_vehicle} service schedule service booklet",
            f"{base_vehicle} owner manual maintenance",
            f"{manufacturer} {model} {transmission} transmission fluid maintenance interval",
            f"{full_vehicle} preventive maintenance common maintenance items",
        ]

    async def _search_query(self, query: str) -> list[SearchResult]:
        payload = {
            "query": query,
            "search_depth": self.search_depth,
            "topic": "general",
            "max_results": self.max_results_per_query,

            # We want evidence, not Tavily's AI answer.
            "include_answer": False,

            # Snippet/content is sufficient initially.
            "include_raw_content": False,

            "include_images": False,
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        timeout = httpx.Timeout(
            connect=10.0,
            read=30.0,
            write=10.0,
            pool=10.0,
        )

        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(self.API_URL, json=payload, headers=headers)
            response.raise_for_status()
            data: dict[str, Any] = response.json()

        search_results: list[SearchResult] = []

        for item in data.get("results", []):
            url = item.get("url")

            if not url:
                continue

            search_results.append(
                SearchResult(
                    title=item.get("title", ""),
                    url=url,
                    content=item.get("content"),
                    score=item.get("score"),
                    query=query,
                )
            )

        return search_results

    @staticmethod
    def _deduplicate_results(results: list[SearchResult]) -> list[SearchResult]:
        deduplicated: dict[str, SearchResult] = {}

        for result in results:
            url = str(result.url)

            existing = deduplicated.get(url)

            # If duplicated across multiple searches,
            # keep the result Tavily ranked highest.
            if (
                existing is None
                or (result.score or 0) > (existing.score or 0)
            ):
                deduplicated[url] = result

        return list(deduplicated.values())