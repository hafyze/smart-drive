from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AutoCare API"
    app_version: str = "1.0.0"

    mongodb_uri: str = "mongodb://127.0.0.1:27017"
    mongodb_database: str = "autocare"

    jwt_secret: str = "change-later"
    jwt_algorithm: str = "HS256"

    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    ai_research_provider: str = "gemini"

    openai_api_key: str = ""
    openai_research_model:str = ""

    gemini_api_key: str = ""
    gemini_research_model: str = ""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

settings = Settings()