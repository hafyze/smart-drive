from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, model_validator
from pydantic_settings import (
    BaseSettings,
    SettingsConfigDict,
)


class Settings(BaseSettings):
    app_env: Literal["development", "test", "production"] = "development"
    app_name: str = "AutoCare API"
    app_version: str = "1.0.0"

    mongodb_uri: str = (
        "mongodb://127.0.0.1:27017"
    )
    mongodb_database: str = "autocare"

    jwt_secret: str = "change-later"
    jwt_algorithm: str = "HS256"

    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    ai_research_provider: str = "gemini"
    ai_search_provider: str = "tavily"

    gemini_api_key: str = ""
    gemini_research_model: str = ""

    tavily_api_key: str = ""
    tavily_search_depth: str = "advanced"
    tavily_max_results: int = Field(default=5, ge=1, le=5)

    model_config = SettingsConfigDict(
        # Local precedence: process environment > .env.local > .env > defaults.
        # Production deployments must inject settings through their secret store;
        # never load developer dotenv files when APP_ENV=production is explicit.
        env_file=(".env", ".env.local"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls,
        init_settings,
        env_settings,
        dotenv_settings,
        file_secret_settings,
    ):
        init_app_env = getattr(init_settings, "init_kwargs", {}).get("app_env")
        process_app_env = getattr(env_settings, "env_vars", {}).get("app_env")
        dotenv_app_env = getattr(dotenv_settings, "env_vars", {}).get("app_env")
        selected_app_env = next(
            (
                value.strip().casefold()
                for value in (init_app_env, process_app_env, dotenv_app_env)
                if isinstance(value, str) and value.strip()
            ),
            "",
        )
        production_selected_outside_dotenv = any(
            isinstance(value, str) and value.strip().casefold() == "production"
            for value in (init_app_env, process_app_env)
        )
        if selected_app_env == "production":
            if not production_selected_outside_dotenv:
                raise ValueError(
                    "Set APP_ENV=production in the process environment; production mode cannot be selected from dotenv files."
                )
            return init_settings, env_settings, file_secret_settings
        return init_settings, env_settings, dotenv_settings, file_secret_settings

    @model_validator(mode="after")
    def validate_production_settings(self):
        if self.app_env != "production":
            return self

        if len(self.jwt_secret) < 32 or self.jwt_secret == "change-later":
            raise ValueError(
                "JWT_SECRET must be set to a unique value of at least 32 characters in production."
            )

        parsed_mongo_uri = urlsplit(self.mongodb_uri)
        mongo_host = parsed_mongo_uri.hostname
        if (
            parsed_mongo_uri.scheme not in {"mongodb", "mongodb+srv"}
            or not mongo_host
            or mongo_host.lower() in {"localhost", "127.0.0.1", "::1"}
        ):
            raise ValueError(
                "MONGODB_URI must point to the production database in production."
            )

        if not self.cors_origins:
            raise ValueError(
                "CORS_ORIGINS must include the deployed frontend origin in production."
            )

        for origin in self.cors_origins:
            parsed_origin = urlsplit(origin)
            origin_host = parsed_origin.hostname
            if (
                origin != origin.strip()
                or parsed_origin.scheme != "https"
                or not parsed_origin.netloc
                or "*" in parsed_origin.netloc
                or not origin_host
                or origin_host.lower() in {"localhost", "127.0.0.1", "::1"}
                or parsed_origin.path not in ("", "/")
                or parsed_origin.query
                or parsed_origin.fragment
                or parsed_origin.username
                or parsed_origin.password
            ):
                raise ValueError(
                    "Each production CORS origin must be an HTTPS origin without a path."
                )

        return self


settings = Settings()
