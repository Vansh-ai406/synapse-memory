"""Configuration management with env var support."""

from functools import lru_cache
from typing import Optional
from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    mongodb_uri: str = Field(default="mongodb://localhost:27017", env="MONGODB_URI")
    mongodb_db: str = Field(default="recallos", env="MONGODB_DB")
    jwt_secret: str = Field(default="change-me", env="JWT_SECRET")
    jwt_expire_minutes: int = Field(default=60 * 24 * 7, env="JWT_EXPIRE_MINUTES")
    gemini_api_key: Optional[str] = Field(default=None, env="GEMINI_API_KEY")
    gemini_chat_model: str = Field(default="gemini-1.5-flash", env="GEMINI_CHAT_MODEL")
    gemini_embed_model: str = Field(default="gemini-embedding-001", env="GEMINI_EMBED_MODEL")
    embedding_dimensions: int = Field(default=768, env="EMBEDDING_DIMENSIONS")

    rank_weight_similarity: float = Field(default=0.50, env="RANK_WEIGHT_SIMILARITY")
    rank_weight_importance: float = Field(default=0.20, env="RANK_WEIGHT_IMPORTANCE")
    rank_weight_confidence: float = Field(default=0.15, env="RANK_WEIGHT_CONFIDENCE")
    rank_weight_recency: float = Field(default=0.15, env="RANK_WEIGHT_RECENCY")

    retrieval_candidates: int = Field(default=12, env="RETRIEVAL_CANDIDATES")
    retrieval_min_similarity: float = Field(default=0.30, env="RETRIEVAL_MIN_SIMILARITY")
    retrieval_max_memories: int = Field(default=5, env="RETRIEVAL_MAX_MEMORIES")

    vector_index_name: str = Field(default="memories_vector", env="VECTOR_INDEX_NAME")

    frontend_origin: str = Field(default="http://localhost:5173", env="FRONTEND_ORIGIN")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @property
    def llm_enabled(self) -> bool:
        return self.gemini_api_key is not None and self.gemini_api_key != ""


@lru_cache()
def get_settings() -> Settings:
    return Settings()