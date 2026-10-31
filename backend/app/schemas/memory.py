from datetime import datetime
from pydantic import BaseModel, Field

from app.schemas.common import MemoryStatus, MemoryType


class MemoryCreate(BaseModel):
    content: str = Field(min_length=3, max_length=1000)
    memory_type: MemoryType
    importance: float = Field(default=0.7, ge=0, le=1)
    context: str | None = Field(default=None, max_length=500)
    expires_at: datetime | None = None


class MemoryUpdate(BaseModel):
    content: str | None = Field(default=None, min_length=3, max_length=1000)
    memory_type: MemoryType | None = None
    importance: float | None = Field(default=None, ge=0, le=1)
    context: str | None = Field(default=None, max_length=500)
    pinned: bool | None = None
    is_sensitive: bool | None = None
    expires_at: datetime | None = None


class ForgetRequest(BaseModel):
    """Delete memories matching a topic, or every memory of one type."""

    topic: str | None = Field(default=None, max_length=300)
    memory_type: MemoryType | None = None


class MemorySearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=1000)
    memory_type: MemoryType | None = None
    limit: int = Field(default=8, ge=1, le=25)


class MemoryOut(BaseModel):
    id: str
    memory_type: MemoryType
    content: str
    context: str | None
    importance: float
    confidence: float
    status: MemoryStatus
    pinned: bool
    is_sensitive: bool
    reason: str | None
    source: dict
    created_at: datetime | None
    updated_at: datetime | None
    last_accessed_at: datetime | None
    expires_at: datetime | None
    access_count: int
    superseded_by: str | None
    supersedes: str | None


class RetrievedMemory(BaseModel):
    memory: MemoryOut
    similarity: float
    score: float
    why: str
    path: str = "vector"  # vector | always-load | exact-scan
