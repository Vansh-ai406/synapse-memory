"""Deterministic local embedder used when no Gemini key is configured.

Token hashing into a fixed vector with hashed positional features. It is not a
semantic model — "resume project" and "portfolio idea" will not land near each
other — but it is stable across process restarts, needs no download, and is
enough to exercise storage, vector search, ranking, and user isolation end to
end. Set GEMINI_API_KEY for real semantic retrieval.
"""

import hashlib
import math
import re

_TOKEN = re.compile(r"[a-z0-9]+")


def _bucket(text: str, modulo: int) -> int:
    digest = hashlib.blake2b(text.encode(), digest_size=8).digest()
    return int.from_bytes(digest, "little") % modulo


def embed(text: str, dimensions: int) -> list[float]:
    vector = [0.0] * dimensions
    tokens = _TOKEN.findall(text.lower())
    if not tokens:
        tokens = ["empty"]

    for index, token in enumerate(tokens):
        vector[_bucket(token, dimensions)] += 1.0
        # Bigrams carry a little word order so "python for dsa" differs from
        # "dsa for python" instead of collapsing to the same bag of words.
        if index + 1 < len(tokens):
            vector[_bucket(token + "_" + tokens[index + 1], dimensions)] += 0.5

    norm = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [value / norm for value in vector]


def cosine(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))