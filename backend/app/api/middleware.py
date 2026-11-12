"""
FastAPI HTTP Middleware for Observability and Telemetry.
Attaches X-Request-Id, tracks duration, populates contextvars,
and logs structured JSON access records.
"""
import time
import uuid
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.telemetry import (
    request_id_ctx,
    escrow_id_ctx,
    intent_id_ctx,
    mandate_id_ctx
)

logger = logging.getLogger("mandate.access")


class TelemetryMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1. Extract or generate Request ID
        req_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
        token_req_id = request_id_ctx.set(req_id)

        # 2. Extract correlation IDs from query params or headers if present
        escrow_id = request.headers.get("X-Escrow-Id") or request.query_params.get("escrow_id")
        intent_id = request.headers.get("X-Intent-Id") or request.query_params.get("intent_id")
        mandate_id = request.headers.get("X-Mandate-Id") or request.query_params.get("mandate_id")

        token_escrow = escrow_id_ctx.set(escrow_id)
        token_intent = intent_id_ctx.set(intent_id)
        token_mandate = mandate_id_ctx.set(mandate_id)

        start_time = time.perf_counter()

        try:
            response: Response = await call_next(request)
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

            response.headers["X-Request-Id"] = req_id
            response.headers["X-Response-Time-Ms"] = str(duration_ms)

            # Structured access log
            logger.info(
                f"{request.method} {request.url.path} {response.status_code} ({duration_ms}ms)",
                extra={
                    "request_id": req_id,
                    "extra_fields": {
                        "method": request.method,
                        "path": request.url.path,
                        "status_code": response.status_code,
                        "duration_ms": duration_ms,
                        "client_ip": request.client.host if request.client else None
                    }
                }
            )
            return response
        except Exception as exc:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.error(
                f"{request.method} {request.url.path} UNHANDLED EXCEPTION: {exc}",
                exc_info=True,
                extra={
                    "request_id": req_id,
                    "extra_fields": {
                        "method": request.method,
                        "path": request.url.path,
                        "duration_ms": duration_ms
                    }
                }
            )
            raise
        finally:
            # Reset contextvars
            request_id_ctx.reset(token_req_id)
            escrow_id_ctx.reset(token_escrow)
            intent_id_ctx.reset(token_intent)
            mandate_id_ctx.reset(token_mandate)

