"""Authentication endpoints: register, login, me."""

from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.auth import RegisterRequest, LoginRequest, AuthResponse, UserOut
from app.core.config import get_settings
from app.core.security import hash_password, verify_password, create_token, get_current_user_id
from app.database.mongodb import users

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=201)
async def register(payload: RegisterRequest):
    db = users()
    existing = await db.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    hashed = hash_password(payload.password)
    user_doc = {
        "name": payload.name,
        "email": payload.email,
        "hashed_password": hashed,
        "memory_paused": False,
    }
    result = await db.insert_one(user_doc)
    token = create_token(str(result.inserted_id))
    user_out = UserOut(
        id=str(result.inserted_id),
        name=payload.name,
        email=payload.email,
        memory_paused=False,
    )
    return AuthResponse(token=token, user=user_out)


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest):
    db = users()
    user = await db.find_one({"email": payload.email})
    if not user or not verify_password(payload.password, user["hashed_password"]):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "Incorrect email or password"
        )
    token = create_token(str(user["_id"]))
    user_out = UserOut(
        id=str(user["_id"]),
        name=user["name"],
        email=user["email"],
        memory_paused=user.get("memory_paused", False),
    )
    return AuthResponse(token=token, user=user_out)


@router.get("/me", response_model=UserOut)
async def me(current_user_id: str = Depends(get_current_user_id)):
    # Re‑fetch from DB so we always have the latest flags etc.
    from app.database.mongodb import users as _users
    db = _users()
    u = await db.find_one({"_id": current_user_id})
    if not u:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return UserOut(
        id=str(u["_id"]),
        name=u["name"],
        email=u["email"],
        memory_paused=u.get("memory_paused", False),
    )