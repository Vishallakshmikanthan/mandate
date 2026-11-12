import asyncio
import logging
from typing import Set, Optional
from app.config import settings
from app.schemas.events import TimelineEvent

logger = logging.getLogger("mandate.stream")


class EventBroadcaster:
    """
    Manages Server-Sent Events (SSE) active subscriber queues.
    Supports local in-memory fan-out and distributed Redis Pub/Sub so multiple
    backend workers/replicas share the exact same live event stream.
    """

    def __init__(self, channel: str = "mandate:events"):
        self.channel = channel
        self._subscribers: Set[asyncio.Queue] = set()
        self._redis_client = None
        self._listener_task: Optional[asyncio.Task] = None
        self._redis_available: bool = False

    async def start(self):
        """Initialize Redis Pub/Sub if REDIS_URL is configured."""
        if not settings.REDIS_URL:
            logger.info("REDIS_URL unset. Using local in-memory event broadcaster.")
            return

        try:
            import redis.asyncio as aioredis
            self._redis_client = aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_timeout=5.0,
                socket_connect_timeout=5.0
            )
            # Test connection
            await self._redis_client.ping()
            self._redis_available = True
            self._listener_task = asyncio.create_task(self._listen_redis())
            logger.info("Distributed Redis Pub/Sub active on channel '%s' (%s).", self.channel, settings.REDIS_URL)
        except Exception as exc:
            logger.warning(
                "Redis connection to %s failed (%s). Falling back to local in-memory broadcasting.",
                settings.REDIS_URL, exc
            )
            self._redis_available = False
            if self._redis_client:
                try:
                    await self._redis_client.aclose()
                except Exception:
                    pass
                self._redis_client = None

    async def stop(self):
        """Clean shutdown of Redis listener and connection."""
        if self._listener_task and not self._listener_task.done():
            self._listener_task.cancel()
            try:
                await self._listener_task
            except asyncio.CancelledError:
                pass
        if self._redis_client:
            try:
                await self._redis_client.aclose()
            except Exception:
                pass
            self._redis_client = None
            self._redis_available = False

    async def _listen_redis(self):
        """Background loop reading from Redis Pub/Sub and dispatching to local subscriber queues."""
        try:
            pubsub = self._redis_client.pubsub()
            await pubsub.subscribe(self.channel)
            logger.info("Subscribed to Redis channel '%s'", self.channel)
            async for message in pubsub.listen():
                if message and message.get("type") == "message":
                    payload = message.get("data")
                    self._dispatch_local(payload)
        except asyncio.CancelledError:
            pass
        except Exception as exc:
            logger.error("Redis Pub/Sub listener encountered error: %s", exc)
            self._redis_available = False

    def _dispatch_local(self, payload: str):
        """Dispatch JSON string payload to all active local SSE subscriber queues."""
        if not self._subscribers:
            return
        dead = set()
        for q in list(self._subscribers):
            try:
                q.put_nowait(payload)
            except Exception:
                dead.add(q)
        for q in dead:
            self._subscribers.discard(q)

    def subscribe(self) -> asyncio.Queue:
        q = asyncio.Queue()
        self._subscribers.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        self._subscribers.discard(q)

    async def broadcast(self, event: TimelineEvent):
        payload = event.model_dump_json()

        # If Redis is available, publish to Redis so all backend replicas receive it
        if self._redis_available and self._redis_client:
            try:
                await self._redis_client.publish(self.channel, payload)
                return
            except Exception as exc:
                logger.warning("Failed to publish event to Redis: %s. Falling back to local dispatch.", exc)

        # Fallback to local dispatch
        self._dispatch_local(payload)


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
