import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db import init_db
from app.api import mandates, intents, escrows, scenarios, stream, audit, webhooks, agents, counterparties, auth, telemetry
from app.api.middleware import TelemetryMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database tables
    init_db()
    from app.core.telemetry import setup_telemetry_logging
    setup_telemetry_logging()
    if settings.APP_ENV == "prod":
        from app.paypal.client import get_paypal_client
        client = get_paypal_client()
        if not client.simulation_mode and not settings.PAYPAL_WEBHOOK_ID:
            raise ValueError("PAYPAL_WEBHOOK_ID must be configured in production (APP_ENV=prod) when not in simulation mode.")

    from app.core.stream_broadcaster import broadcaster
    await broadcaster.start()

    expiry_task = None
    if settings.APP_ENV != "test":
        from app.core.expiry import run_expiry_loop
        expiry_task = asyncio.create_task(run_expiry_loop(interval_seconds=60))

    try:
        yield
    finally:
        await broadcaster.stop()
        if expiry_task and not expiry_task.done():
            expiry_task.cancel()
            try:
                await expiry_task
            except asyncio.CancelledError:
                pass


app = FastAPI(
    title="MANDATE: The Trust Layer for AI Agents That Spend Money",
    description="Deterministic financial firewall, AI-arbitrated escrow, and cryptographic audit log for autonomous agent commerce.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware: explicit allowed origins without wildcard
raw_origins = [o.strip() for o in settings.FRONTEND_ORIGIN.split(",") if o.strip()]
origins = []
for o in raw_origins + ["http://localhost:3000", "http://127.0.0.1:3000"]:
    if o and o != "*" and o not in origins:
        origins.append(o)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)
app.add_middleware(TelemetryMiddleware)

# Mount API Routers
app.include_router(mandates.router, prefix="/api")
app.include_router(intents.router, prefix="/api")
app.include_router(escrows.router, prefix="/api")
app.include_router(scenarios.router, prefix="/api")
app.include_router(stream.router, prefix="/api")
app.include_router(audit.router, prefix="/api")
app.include_router(webhooks.router, prefix="/api")
app.include_router(agents.router, prefix="/api")
app.include_router(counterparties.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(telemetry.router, prefix="/api")


@app.get("/api/health", tags=["Health"])
def health_check():
    """System health check and runtime diagnostic summary."""
    return {
        "status": "healthy",
        "service": "mandate-gateway",
        "app_env": settings.APP_ENV,
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
