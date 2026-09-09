import os

from app.ai.search.base import MaintenanceSearchProvider
from app.ai.search.tavily_provider import TavilySearchProvider

from app.core.config import settings

def get_maintenance_search_provider() -> MaintenanceSearchProvider:
    provider = (
        settings.ai_search_provider
            .strip()
            .lower()
    )

    if provider == "tavily":
        return TavilySearchProvider()

    raise ValueError(
        f"Unsupported AI search provider: {provider}"
    )