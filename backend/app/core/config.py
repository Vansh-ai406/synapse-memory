"""Configuration management with env var support (pydantic-settings v2)."""

from functools import lru_cache
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    mongodb_uri: str = Field(default="mongodb://localhost:27017")
    mongodb_db: str = Field(default="recallos")
    jwt_secret: str = Field(default="change-me")
    jwt_expire_minutes: int = Field(default=60 * 24 * 7)
    gemini_api_key: Optional[str] = Field(default=None)
    gemini_chat_model: str = Field(default="gemini-2.0-flash")
    gemini_embed_model: str = Field(default="gemini-embedding-001")
    embedding_dimensions: int = Field(default=768)

    rank_weight_similarity: float = Field(default=0.50)
    rank_weight_importance: float = Field(default=0.20)
    rank_weight_confidence: float = Field(default=0.15)
    rank_weight_recency: float = Field(default=0.15)

    retrieval_candidates: int = Field(default=12)
    retrieval_min_similarity: float = Field(default=0.30)
    retrieval_max_memories: int = Field(default=5)

    vector_index_name: str = Field(default="memories_vector")

    frontend_origin: str = Field(default="http://localhost:5173")

    @property
    def llm_enabled(self) -> bool:
        return bool(self.gemini_api_key)


@lru_cache()
def get_settings() -> Settings:
    return Settings()
