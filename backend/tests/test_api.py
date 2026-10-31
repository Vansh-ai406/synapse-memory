"""API-level tests against a running backend (http://localhost:8000).

Covers the plan's minimum test set: isolation, beat 2, beat 4 (correction),
forget, and seed idempotency. LLM-dependent calls fall back to the
deterministic template path when quota is exhausted — outcome assertions are
therefore stable either way.

Run: python -m pytest tests/test_api.py -q   (server must be up)
"""

import os
import uuid
import httpx
import pytest

BASE = os.getenv("RECALLOS_API_BASE", "http://localhost:8000")


def _client(base: str = BASE, token: str | None = None) -> httpx.Client:
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    return httpx.Client(base_url=base + "/api", headers=headers, timeout=120)


def test_health() -> None:
    r = httpx.get(BASE + "/health", timeout=10)
    assert r.status_code == 200


def test_dashboard_auth_and_stats() -> None:
    with _client() as c:
        assert c.get('/dashboard/stats').status_code == 401
        token, _ = _register(c)
    with _client(token=token) as c:
        response = c.get('/dashboard/stats')
        assert response.status_code == 200
        assert response.json()['active_memories'] == 0


def test_change_stream_is_scoped() -> None:
    import asyncio
    import json

    async def scenario():
        async with httpx.AsyncClient(base_url=BASE + '/api', timeout=20) as client:
            tokens = []
            for _ in range(2):
                response = await client.post('/auth/register', json={
                    'name': 'Stream test', 'email': f'stream_{uuid.uuid4().hex}@test.local',
                    'password': 'S3curePass!',
                })
                response.raise_for_status()
                tokens.append(response.json()['token'])
            async with client.stream('GET', '/agent/memories/stream', headers={'Authorization': f'Bearer {tokens[0]}'}) as stream:
                stream.raise_for_status()
                lines = stream.aiter_lines()
                async def event():
                    async for line in lines:
                        if line.startswith('data: '):
                            return json.loads(line[6:])
                    raise AssertionError('Stream ended without an event')
                assert (await asyncio.wait_for(event(), 10))['type'] == 'connected'
                for index in (1, 0):
                    response = await client.post('/memories', headers={'Authorization': f'Bearer {tokens[index]}'}, json={
                        'content': f'Stream test user {index} prefers morning sessions.',
                        'memory_type': 'PREFERENCE', 'importance': 0.7,
                    })
                    response.raise_for_status()
                    if index == 0:
                        expected_id = response.json()['id']
                change = await asyncio.wait_for(event(), 10)
                assert change['type'] == 'insert'
                assert change['memory_id'] == expected_id
    asyncio.run(scenario())


def test_isolation() -> None:
    with httpx.Client(base_url=BASE + "/api", timeout=60) as c:
        token_a, _ = _register(c)
        token_b, _ = _register(c)

    with _client(token=token_a) as ca:
        r = ca.post("/memories", json={"content": "Only user A knows this secret word XZQUUX", "memory_type": "FACT", "importance": 0.7})
        assert r.status_code == 201, r.text

    with _client(token=token_b) as cb:
        for r in (
            cb.get("/memories"),
            cb.get("/memories", params={"status": "active"}),
            cb.post("/memories/search", json={"query": "secret word XZQUUX"}),
        ):
            body = r.json()
            if isinstance(body, list):
                text = " ".join((m.get("content", "") or (m.get("memory") or {}).get("content", "")) for m in body)
                assert "XZQUUX" not in text


def _register(c: httpx.Client) -> tuple[str, str]:
    email = f"t_{uuid.uuid4().hex[:10]}@test.local"
    r = c.post("/auth/register", json={"name": "T", "email": email, "password": "S3curePass!"})
    r.raise_for_status()
    return r.json()["token"], email


def test_beat2_recall_changes_plan() -> None:
    with httpx.Client(base_url=BASE + "/api", timeout=60) as c:
        token, _ = _register(c)
    with _client(token=token) as c:
        r = c.post("/agent/chat", json={"message": "I prefer short morning study sessions, before 9 AM."})
        assert r.status_code == 200, r.text
        d = r.json()
        assert any(ch["action"] in ("created", "unrelated") for ch in d["changes"]), d["changes"]

        r = c.post("/agent/chat", json={"message": "Plan my MongoDB revision."})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["retrieved"], "expected at least one recalled memory"
        afternoon = "morning" in d["reply"].lower()
        assert afternoon, "plan should mention the stored morning preference"
        # memory-off comparison must differ in evidence, not in stored data
        r = c.post("/agent/chat", json={"message": "Plan my MongoDB revision.", "use_memory": False})
        assert r.status_code == 200
        assert not r.json()["retrieved"], "memory-off must not retrieve memories"


def test_beat4_correction_supersedes() -> None:
    with httpx.Client(base_url=BASE + "/api", timeout=60) as c:
        token, _ = _register(c)
    with _client(token=token) as c:
        c.post("/agent/chat", json={"message": "I prefer short morning study sessions."})
        r = c.post("/agent/chat", json={"message": "Actually I now prefer evening sessions after 7 PM."})
        assert r.status_code == 200, r.text

        mems = c.get("/memories").json()
        statuses = {m["status"] for m in mems}
        assert "superseded" in statuses, f"old memory should be superseded: {[(m['memory_type'], m['content'], m['status']) for m in mems]}"

        old = next(m for m in mems if m["status"] == "superseded")
        new = next(m for m in mems if m["status"] == "active" and "evening" in m["content"].lower())
        assert new["supersedes"] == old["id"], "new memory must link the old one"
        newMem = None
        for m in mems:
            if m["status"] == "active" and "evening" in m["content"].lower():
                # evening preference
                assert m["memory_type"] == "PREFERENCE" or "prefer" in m["content"].lower()

        r = c.post("/agent/chat", json={"message": "Plan my MongoDB revision."})
        assert r.status_code == 200
        assert "evening" in r.json()["reply"].lower() or "7 pm" in r.json()["reply"].lower()


def test_forget() -> None:
    with httpx.Client(base_url=BASE + "/api", timeout=60) as c:
        token, _ = _register(c)
    with _client(token=token) as c:
        c.post("/agent/chat", json={"message": "I prefer short morning study sessions."})
        mems_before = c.get("/memories").json()
        assert mems_before

        r = c.post("/agent/chat", json={"message": "Forget that."})
        assert r.status_code == 200
        mems_after = c.get("/memories").json()
        active = [m for m in mems_after if m["status"] == "active"]
        assert not active, "deleted memory must not be listed as active"

        r = c.post("/agent/chat", json={"message": "Plan my MongoDB revision."})
        retrieved = r.json()["retrieved"]
        assert not [x for x in retrieved if "morning" in x["memory"]["content"].lower()], \
            "deleted memory must not be recalled"


def test_seed_idempotent() -> None:
    """Running the demo reset twice must not duplicate users."""
    import subprocess
    import sys
    from pathlib import Path

    venv_py = sys.executable
    script = Path(__file__).resolve().parents[1] / "scripts" / "reset_demo_data.py"
    for _ in range(2):
        subprocess.run([venv_py, str(script)], check=True, capture_output=True)
    from pymongo import MongoClient
    import os
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
    client = MongoClient(os.getenv("MONGODB_URI"), serverSelectionTimeoutMS=8000)
    db = client[os.getenv("MONGODB_DB", "recallos")]
    assert db["users"].count_documents({"email": "demo@recallos.app"}) == 1
    assert db["users"].count_documents({"email": "other@recallos.app"}) == 1
    client.close()
