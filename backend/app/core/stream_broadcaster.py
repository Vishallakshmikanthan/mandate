import asyncio
import json
import logging
from typing import Set
from app.schemas.events import TimelineEvent

logger = logging.getLogger("mandate.stream")


class EventBroadcaster:
    """Manages Server-Sent Events (SSE) active subscriber queues."""

    def __init__(self):
        self._subscribers: Set[asyncio.Queue] = set()

    def subscribe(self) -> asyncio.Queue:
        q = asyncio.Queue()
        self._subscribers.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        self._subscribers.discard(q)

    async def broadcast(self, event: TimelineEvent):
        if not self._subscribers:
            return
        payload = event.model_dump_json()
        dead = set()
        for q in self._subscribers:
            try:
                q.put_nowait(payload)
            except Exception:
                dead.add(q)
        for q in dead:
            self._subscribers.discard(q)


broadcaster = EventBroadcaster()


async def emit_timeline_event(
    event_type: str,
    actor: str,
    step: str,
    summary: str,
    status: str = "INFO",
    data: dict = None,
    scenario: str = None
):
    """Helper to dispatch timeline event to all connected dashboard SSE streams."""
    import uuid
    evt = TimelineEvent(
        id=str(uuid.uuid4()),
        scenario=scenario,
        event_type=event_type,
        actor=actor,
        step=step,
        summary=summary,
        status=status,
        data=data or {}
    )
    await broadcaster.broadcast(evt)
