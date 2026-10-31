from pydantic import BaseModel, Field

from app.schemas.common import FeedbackRating
from app.schemas.memory import MemoryOut, RetrievedMemory


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    conversation_id: str | None = None


class MemoryChange(BaseModel):
    action: str  # created | superseded | contextual | skipped_duplicate | skipped_sensitive | needs_clarification
    memory: MemoryOut | None = None
    previous: MemoryOut | None = None
    reason: str


class ChatResponse(BaseModel):
    conversation_id: str
    message_id: str
    reply: str
    provider: str  # "gemini" or "local"
    retrieval_mode: str  # "vector" or "exact"
    retrieved: list[RetrievedMemory]
    changes: list[MemoryChange]
    clarification: str | None = None


class FeedbackRequest(BaseModel):
    message_id: str
    rating: FeedbackRating
    note: str | None = Field(default=None, max_length=500)
