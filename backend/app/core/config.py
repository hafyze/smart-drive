from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "Autocare API"
    app_version: str = "1.0.0"

    mongodb_uri: str = "mongodb://127.0.0.1:27017"
    mongodb_database: str = "autocare"

    jwt_secret: str = "change-later"
    jwt_algorithm: str = "HS256"

    cors_origin: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()