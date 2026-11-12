import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from starlette.testclient import TestClient

from app.db import Base, get_db
from app.main import app
from app.config import settings
from app.core.mandate_signing import sign_policy
from app.models.mandate import Mandate
from app.models.intent import PaymentIntent
from app.models.escrow import Escrow
from app.models.deliverable import Deliverable
from app.models.arbiter import ArbiterVerdictRecord
from app.models.audit import AuditLog
from app.models.webhook import WebhookEvent
from app.models.counterparty import Counterparty

# Use in-memory SQLite with StaticPool so all connections share the memory DB
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    default_cp = Counterparty(
        handle="seller_agent_acme",
        paypal_merchant_id="SANDBOX_MERCHANT_ACME",
        paypal_email="seller-acme@example.com",
        status="VERIFIED",
        verified_at=datetime.now(timezone.utc)
    )
    session.add(default_cp)
    session.commit()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def sample_policy():
    return {
        "version": 1,
        "currency": "USD",
        "max_total_minor": 50000,
        "max_per_transaction_minor": 20000,
        "daily_limit_minor": 30000,
        "allowed_merchant_categories": ["freelance_design", "software_services"],
        "allowed_counterparties": ["seller_agent_acme"],
        "blocked_counterparties": ["unverified_seller_66"],
        "allowed_hours_utc": {"start": "00:00", "end": "23:59"},
        "velocity": {"max_txns_per_hour": 5},
        "escalate_above_minor": 15000,
        "require_escrow": True,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat().replace("+00:00", "Z")
    }


@pytest.fixture
def sample_mandate(db_session, sample_policy):
    sig = sign_policy(sample_policy, settings.MANDATE_SIGNING_KEY)
    mandate = Mandate(
        owner_id="test_principal_user",
        agent_id="buyer_agent_alpha",
        policy=sample_policy,
        signature=sig,
        status="ACTIVE",
        expires_at=datetime.now(timezone.utc) + timedelta(days=30)
    )
    db_session.add(mandate)
    db_session.commit()
    db_session.refresh(mandate)
    return mandate
