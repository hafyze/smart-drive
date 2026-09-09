import os

from app.ai.search.base import MaintenanceSearchProvider
from app.ai.search.tavily_provider import TavilySearchProvider


def get_maintenance_search_provider() -> MaintenanceSearchProvider:
    provider = os.getenv(
        "AI_SEARCH_PROVIDER",
        "tavily",
    ).lower()

    if provider == "tavily":
        return TavilySearchProvider()

    raise ValueError(
        f"Unsupported AI search provider: {provider}"
    )