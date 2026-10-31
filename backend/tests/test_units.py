"""Unit tests — no network, no server. Run: python -m pytest tests -q"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.memory_extractor import is_storable, is_sensitive  # noqa: E402
from app.services.memory_conflict_resolver import _token_judgement  # noqa: E402
from app.services.llm_service import detect_intent  # noqa: E402


def test_intents() -> None:
    assert detect_intent("Plan my MongoDB revision") == "plan"
    assert detect_intent("I prefer short morning sessions") == "inform"
    assert detect_intent("Forget that") == "forget"
    assert detect_intent("Explain binary search") == "explain"


def test_storable_gate() -> None:
    # Requests are never stored…
    assert not is_storable("Plan my MongoDB revision")
    assert not is_storable("Explain binary search")
    assert not is_storable("Forget my morning preference")
    # …but corrections, decisions and statements are.
    assert is_storable("Actually I now prefer evening sessions after 7 PM")
    assert is_storable("I prefer short morning study sessions")
    assert is_storable("We decided to use FastAPI for the backend")


def test_sensitive_never_stored() -> None:
    assert is_sensitive("my password: hunter2secret")
    assert is_sensitive("api.key = AIzaSUPERSECRET1234")
    assert not is_sensitive("I prefer short morning study sessions")


def test_token_judgement_duplicate() -> None:
    old = {"content": "User prefers short morning study sessions"}
    new = "User prefers short morning study sessions before 9 AM"
    assert _token_judgement(new, old)["relation"] == "duplicate"


def test_token_judgement_supersede() -> None:
    old = {"content": "User prefers short morning study sessions"}
    new = "User prefers evening sessions after 7 PM"
    assert _token_judgement(new, old)["relation"] == "supersede"


def test_token_judgement_unrelated() -> None:
    old = {"content": "User prefers short morning study sessions"}
    assert _token_judgement("Plan my MongoDB revision", old)["relation"] == "unrelated"
