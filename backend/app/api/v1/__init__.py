"""API version 1 routers."""

from fastapi import APIRouter

from app.api.v1 import auth, memories, chat, dashboard, simulation

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(memories.router)
api_router.include_router(chat.router)
api_router.include_router(dashboard.router)
api_router.include_router(simulation.router)