"""FastAPI application entry point."""

from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pymongo.errors import PyMongoError

from app.core.config import get_settings
from app.database.mongodb import ping, async_ensure_indexes, close
from app.api.v1 import auth, memories, chat, dashboard, simulation
from app.api.v1 import memory_stream


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    settings = get_settings()
    print(f"Starting RecallOS API — LLM: {'enabled' if settings.llm_enabled else 'disabled (local embeddings only)'}")
    print(f"Embedding provider: {settings.gemini_embed_model if settings.llm_enabled else 'local hash'}")
    print(f"Chat model: {settings.gemini_chat_model if settings.llm_enabled else 'template fallback'}")
    try:
        ok = await ping()
        await async_ensure_indexes()
        print("MongoDB connected and indexes ensured")
    except Exception as e:
        print(f"Warning: MongoDB connection failed: {type(e).__name__}")
    yield
    # Shutdown
    await close()
    print("Shutdown complete")


app = FastAPI(
    title="RecallOS API",
    description="Persistent-memory AI assistant API",
    version="0.3.0",
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
app.include_router(memory_stream.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "version": app.version}


@app.get("/health/ready")
async def ready():
    try:
        await ping()
    except PyMongoError:
        return JSONResponse(status_code=503, content={"status": "unavailable", "database": "disconnected"})
    return {"status": "ready", "database": "connected", "version": app.version}


@app.exception_handler(PyMongoError)
async def database_unavailable(request, exc):
    return JSONResponse(status_code=503, content={"detail": "Memory storage is temporarily unavailable. Please try again shortly."})


# Serve only the production bundle, never the repository or environment files.
frontend_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
