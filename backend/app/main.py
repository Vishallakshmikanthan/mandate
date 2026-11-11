from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db import init_db
from app.api import mandates, intents, escrows, scenarios, stream, audit, webhooks


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database tables
    init_db()
    yield
    # Shutdown logic if needed


app = FastAPI(
    title="MANDATE: The Trust Layer for AI Agents That Spend Money",
    description="Deterministic financial firewall, AI-arbitrated escrow, and cryptographic audit log for autonomous agent commerce.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
origins = [
    settings.FRONTEND_ORIGIN,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(mandates.router, prefix="/api")
app.include_router(intents.router, prefix="/api")
app.include_router(escrows.router, prefix="/api")
app.include_router(scenarios.router, prefix="/api")
app.include_router(stream.router, prefix="/api")
app.include_router(audit.router, prefix="/api")
app.include_router(webhooks.router, prefix="/api")


@app.get("/api/health", tags=["Health"])
def health_check():
    """System health check and runtime diagnostic summary."""
    return {
        "status": "healthy",
        "service": "mandate-gateway",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": "sqlite" if settings.DATABASE_URL.startswith("sqlite") else "postgresql",
        "paypal_mode": "simulation" if (settings.PAYPAL_SIMULATION_MODE or not settings.PAYPAL_CLIENT_ID or settings.PAYPAL_CLIENT_ID.startswith("your_")) else "sandbox",
        "llm_provider": settings.LLM_PROVIDER,
        "demo_replay_mode": settings.DEMO_REPLAY_MODE
    }


@app.get("/")
def root():
    return {
        "message": "Welcome to MANDATE API - The Trust Layer for AI Agents That Spend Money",
        "docs_url": "/docs",
        "health_url": "/api/health"
    }
