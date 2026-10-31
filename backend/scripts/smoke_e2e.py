"""End-to-end smoke test against the running backend (real Atlas + Gemini).

Creates a throwaway user, runs the demo beats, prints evidence, cleans up.
Run: python scripts/smoke_e2e.py
"""
import asyncio
import os
import time
import uuid

import httpx

BASE = os.getenv("RECALLOS_API_BASE", "http://127.0.0.1:8000").rstrip('/') + '/api'
DB_NAME = "recallos"


async def main() -> None:
    email = f"smoke_{uuid.uuid4().hex[:8]}@test.local"
    async with httpx.AsyncClient(base_url=BASE, timeout=90) as c:
        # --- register
        r = await c.post("/auth/register", json={"name": "Smoke", "email": email, "password": "S3curePass!"})
        r.raise_for_status()
        token = r.json()["token"]
        uid = r.json()["user"]["id"]
        print(f"[auth] registered user {uid[:8]}…")
        c.headers.update({"Authorization": f"Bearer {token}"})

        # --- beat 1: create
        r = await c.post("/agent/chat", json={"message": "I prefer short morning study sessions, before 9 AM."})
        r.raise_for_status()
        d = r.json()
        print(f"[beat1] changes={[x['action'] for x in d['changes']]} provider={d['provider']}")
        assert any(x["action"] in ("created", "unrelated") for x in d["changes"]), "expected a created memory"
        print(f"[beat1] reply: {d['reply'][:140]}")

        mems = (await c.get("/memories")).json()
        print(f"[beat1] memory count={len(mems)} types={[m['memory_type'] for m in mems]}")

        # --- beat 2: recall changes output (new conversation)
        time.sleep(1)
        r = await c.post("/agent/chat", json={"message": "Plan my MongoDB revision."})
        r.raise_for_status()
        d = r.json()
        print(f"[beat2] retrieval_mode={d['retrieval_mode']} retrieved={[ (x['path'], round(x['similarity'],2)) for x in d['retrieved'] ]}")
        low = "morning" in d["reply"].lower() or "9 am" in d["reply"].lower() or "before 9" in d["reply"].lower()
        print(f"[beat2] reply mentions morning={low}: {d['reply'][:200]}")

        await beat3_4(c)
        await print_db_state(uid)


async def beat3_4(c: httpx.AsyncClient) -> None:
    # --- beat 4: correction
    r = await c.post("/agent/chat", json={"message": "Changed my mind — I now prefer evening sessions after 7 PM."})
    r.raise_for_status()
    d = r.json()
    print(f"[beat4] changes={[(x['action'], x['reason'][:60]) for x in d['changes']]}")
    await asyncio.sleep(1)
    mems = (await c.get("/memories")).json()
    by_status = {}
    for m in mems:
        by_status.setdefault(m["status"], []).append(m["memory_type"])
    print(f"[beat4] statuses={by_status}")

    r = await c.post("/agent/chat", json={"message": "Plan my MongoDB revision."})
    r.raise_for_status()
    d = r.json()
    ev = "evening" in d["reply"].lower() or "7 pm" in d["reply"].lower()
    print(f"[beat4] new plan uses evening={ev}: {d['reply'][:200]}")


async def print_db_state(uid: str) -> None:
    from pymongo import MongoClient
    import os
    from dotenv import load_dotenv  # type: ignore

    load_dotenv()
    uri = os.getenv("MONGODB_URI")
    client = MongoClient(uri, serverSelectionTimeoutMS=8000)
    db = client[DB_NAME]
    mems = list(db["memories"].find({"user_id": uid}))
    print("[db] memories:")
    for m in mems:
        print(f"   {m['memory_type']:10} {m['status']:10} {m['content'][:70]} supersedes={bool(m.get('supersedes'))}")
    hist = list(db["memory_history"].find({"user_id": uid}).sort("created_at", -1).limit(5))
    print("[db] recent history:")
    for h in hist:
        print(f"   {h['action']:12} {h.get('old_content') or h.get('new_content') or h.get('reason','') or ''}"[:110])
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
