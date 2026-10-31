"""FastAPI application entry point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.database.mongodb import ping, ensure_indexes, close
from app.api.v1 import auth, memories, chat, dashboard, simulation


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    settings = get_settings()
    print(f"Starting RecallOS API — LLM: {'enabled' if settings.llm_enabled else 'disabled (local embeddings only)'}")
    print(f"Embedding provider: {settings.gemini_embed_model if settings.llm_enabled else 'local hash'}")
    print(f"Chat model: {settings.gemini_chat_model if settings.llm_enabled else 'template fallback'}")
    try:
        ping()
        ensure_indexes()
        print("MongoDB connected and indexes ensured")
    except Exception as e:
        print(f"Warning: MongoDB connection failed: {e}")
    yield
    # Shutdown
    close()
    print("Shutdown complete")


app = FastAPI(
    title="RecallOS API",
    description="Persistent-memory AI assistant API",
    version="0.1.0",
    lifespan=lifespan,
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(memories.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(simulation.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}