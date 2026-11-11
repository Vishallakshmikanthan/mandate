import asyncio
import json
from fastapi import APIRouter
from starlette.responses import StreamingResponse
from app.core.stream_broadcaster import broadcaster

router = APIRouter(tags=["Realtime Stream"])


@router.get("/stream")
async def event_stream():
    """
    Server-Sent Events (SSE) live timeline endpoint.
    Streams real-time agent messages, gateway verdicts, and escrow transitions.
    """
    queue = broadcaster.subscribe()

    async def event_generator():
        try:
            # Send initial connection handshake
            init_event = json.dumps({
                "event_type": "CONNECTED",
                "actor": "gateway",
                "step": "Stream Connected",
                "summary": "Real-time timeline event stream active.",
                "status": "INFO"
            })
            yield f"data: {init_event}\n\n"

            while True:
                data = await queue.get()
                yield f"data: {data}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            broadcaster.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
