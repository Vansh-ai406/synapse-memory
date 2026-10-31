"""Embeddings. Gemini when a key is set, local hashing embedder otherwise.

Both produce vectors of settings.embedding_dimensions, so the Atlas index
definition never changes when you switch provider.
"""

import httpx

from app.core.config import get_settings
from app.core.logging import logger
from app.services.hash_embedder import embed as local_embed

_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:embedContent"


class EmbeddingError(RuntimeError):
    pass


def provider() -> str:
    return "gemini" if get_settings().llm_enabled else "local"


def _gemini_embed(text: str) -> list[float]:
    settings = get_settings()
    url = _ENDPOINT.format(model=settings.gemini_embed_model)
    body = {
        "content": {"parts": [{"text": text}]},
        "outputDimensionality": settings.embedding_dimensions,
    }
    try:
        response = httpx.post(url, params={"key": settings.gemini_api_key}, json=body, timeout=30)
    except httpx.HTTPError as exc:
        raise EmbeddingError(f"Embedding request failed: {exc}") from exc
    if response.status_code != 200:
        logger.error("gemini embed status=%s", response.status_code)
        raise EmbeddingError(f"Gemini embeddings returned {response.status_code}")
    values = response.json().get("embedding", {}).get("values")
    if not values or len(values) != settings.embedding_dimensions:
        raise EmbeddingError("Gemini returned an unexpected embedding shape")
    return values


def embed(text: str) -> list[float]:
    text = text.strip()
    if not text:
        raise EmbeddingError("Cannot embed empty text")
    if get_settings().llm_enabled:
        return _gemini_embed(text)
    return local_embed(text, get_settings().embedding_dimensions)


def embed_many(texts: list[str]) -> list[list[float]]:
    return [embed(text) for text in texts]