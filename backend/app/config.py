"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # Database
    database_url: str = "mysql+aiomysql://user:password@localhost:3306/voltex_ai"

    # Backend
    backend_secret_key: str = "change-me-to-a-random-64-char-string"
    backend_cors_origins: str = "http://localhost:3000"

    # Firebase
    firebase_service_account_json: str = ""

    # Groq
    groq_api_key: str = ""

    # File uploads
    upload_dir: str = "./uploads"
    max_upload_size_mb: int = 20

    # Rate limiting
    rate_limit_per_minute: int = 30

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.backend_cors_origins.split(",")]

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    model_config = {
        "env_file": [".env", "../.env"],
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
