from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    # App Information
    PROJECT_NAME: str = "MapMyTrain Core"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Infrastructure Connections
    DATABASE_URL: str = Field(
        default="postgresql://mmt_user:dev_password@localhost:5432/mapmytrain_dev",
        validation_alias="DATABASE_URL",
    )
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        validation_alias="REDIS_URL",
    )

    # Operational Flag Controls
    DEVELOPMENT_MOCK_MODE: bool = True
    INGESTION_INTERVAL_SECONDS: int = 120

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
