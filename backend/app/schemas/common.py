"""Shared enums and serialization helpers."""

from datetime import datetime
from enum import Enum

from bson import ObjectId


class MemoryType(str, Enum):
    FACT = "FACT"
    PREFERENCE = "PREFERENCE"
    GOAL = "GOAL"
    DECISION = "DECISION"
    EXPERIENCE = "EXPERIENCE"
    CONSTRAINT = "CONSTRAINT"
    FEEDBACK = "FEEDBACK"
    TASK = "TASK"
    STRATEGY = "STRATEGY"


class MemoryStatus(str, Enum):
    ACTIVE = "active"
    SUPERSEDED = "superseded"
    DELETED = "deleted"


class FeedbackRating(str, Enum):
    HELPFUL = "helpful"
    NOT_HELPFUL = "not_helpful"
    TOO_COMPLICATED = "too_complicated"
    TOO_DETAILED = "too_detailed"
    INCORRECT = "incorrect"
    NOT_RELEVANT = "not_relevant"


def oid(value) -> str:
    return str(value) if isinstance(value, ObjectId) else value


def iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.isoformat()
