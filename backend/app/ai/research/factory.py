from app.ai.research.base import (
    MaintenanceResearchProvider,
)
from app.ai.research.gemini_provider import (
    GeminiResearchProvider,
)
from app.ai.research.openai_provider import (
    OpenAIResearchProvider,
)
from app.core.config import settings


def get_research_provider(
) -> MaintenanceResearchProvider:

    provider = (
        settings.ai_research_provider
        .strip()
        .lower()
    )

    if provider == "gemini":
        return GeminiResearchProvider()

    if provider == "openai":
        return OpenAIResearchProvider()

    raise ValueError(
        f"Unsupported AI research provider: {provider}"
    )