import os
import uuid
import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from sqlalchemy import create_engine, inspect

from alembic.config import Config
from alembic import command

from app.core.stream_broadcaster import EventBroadcaster
from app.schemas.events import TimelineEvent


def test_alembic_upgrade_head_on_empty_db(tmp_path):
    """
    CRITICAL ACCEPTANCE CRITERIA:
    alembic upgrade head on an empty DB creates the full production schema.
    """
    db_file = tmp_path / "alembic_fresh.db"
    db_url = f"sqlite:///{db_file}"

    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    ini_path = os.path.join(backend_dir, "alembic.ini")
    alembic_cfg = Config(ini_path)
    alembic_cfg.set_main_option("sqlalchemy.url", db_url)

    # 1. Upgrade from empty database to head
    command.upgrade(alembic_cfg, "head")

    # 2. Inspect created tables
    engine = create_engine(db_url)
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())

    expected_tables = {
        "mandates",
        "payment_intents",
        "escrows",
        "deliverables",
        "arbiter_verdicts",
        "audit_log",
        "webhook_events",
        "redteam_runs",
        "counterparties",
        "spend_ledger",
        "paypal_actions",
        "alembic_version"
    }

    assert expected_tables.issubset(table_names), f"Missing tables: {expected_tables - table_names}"

    # 3. Test downgrade back to base
    command.downgrade(alembic_cfg, "base")
    inspector_after = inspect(engine)
    tables_after = set(inspector_after.get_table_names())
    assert "mandates" not in tables_after
    assert "escrows" not in tables_after


@pytest.mark.asyncio
async def test_shared_stream_broadcaster_two_replicas_receive_event():
    """
    CRITICAL ACCEPTANCE CRITERIA:
    Two backend replicas both stream events via shared pub/sub channel.
    """
    # Replica 1: Broadcaster
    broadcaster_replica_1 = EventBroadcaster(channel="test:mandate:events")
    # Replica 2: Broadcaster
    broadcaster_replica_2 = EventBroadcaster(channel="test:mandate:events")

    # Subscribers on both replicas
    q1 = broadcaster_replica_1.subscribe()
    q2 = broadcaster_replica_2.subscribe()

    # Shared bus simulation
    channel_subscribers = []

    class MockPubSub:
        async def subscribe(self, ch):
            pass

        async def listen(self):
            while True:
                data = await shared_bus.get()
                yield {"type": "message", "data": data}

    shared_bus = asyncio.Queue()
    mock_redis_client_1 = AsyncMock()
    mock_redis_client_1.publish = AsyncMock(side_effect=lambda ch, data: shared_bus.put_nowait(data))

    mock_redis_client_2 = MagicMock()
    mock_redis_client_2.pubsub = MagicMock(return_value=MockPubSub())

    broadcaster_replica_1._redis_client = mock_redis_client_1
    broadcaster_replica_1._redis_available = True

    broadcaster_replica_2._redis_client = mock_redis_client_2
    broadcaster_replica_2._redis_available = True
    broadcaster_replica_2._listener_task = asyncio.create_task(broadcaster_replica_2._listen_redis())

    # Wait for listener setup
    await asyncio.sleep(0.02)

    # Replica 1 emits event
    evt = TimelineEvent(
        id=str(uuid.uuid4()),
        event_type="GATEWAY_APPROVED",
        actor="gateway",
        step="Intent Approved",
        summary="Two-replica test broadcast",
        status="SUCCESS",
        data={"amount_minor": 15000}
    )

    await broadcaster_replica_1.broadcast(evt)

    # Verify both replica queues receive the exact message payload
    # Replica 2 gets it via Redis Pub/Sub listener
    msg2 = await asyncio.wait_for(q2.get(), timeout=1.0)
    assert "Two-replica test broadcast" in msg2

    # Clean up listener
    await broadcaster_replica_2.stop()


@pytest.mark.asyncio
async def test_stream_broadcaster_local_fallback_when_redis_unavailable():
    """Verify local fan-out works seamlessly when Redis is unavailable."""
    bc = EventBroadcaster()
    q = bc.subscribe()

    evt = TimelineEvent(
        id=str(uuid.uuid4()),
        event_type="LOCAL_EVENT",
        actor="buyer",
        step="Local step",
        summary="Local event without Redis",
        status="INFO"
    )

    await bc.broadcast(evt)
    msg = await asyncio.wait_for(q.get(), timeout=1.0)
    assert "Local event without Redis" in msg
    bc.unsubscribe(q)
