import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.config import settings

db_url = settings.DATABASE_URL
connect_args = {}

if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    db_url,
    connect_args=connect_args,
    echo=False,
    future=True
)

# Enable foreign keys on SQLite connections
if db_url.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    # Import all models to ensure they are registered with Base.metadata
    from app.models.mandate import Mandate
    from app.models.intent import PaymentIntent
    from app.models.escrow import Escrow
    from app.models.deliverable import Deliverable
    from app.models.arbiter import ArbiterVerdictRecord
    from app.models.audit import AuditLog
    from app.models.webhook import WebhookEvent
    from app.models.redteam import RedTeamRun
    from app.models.counterparty import Counterparty
    from app.models.spend_ledger import SpendLedger
    from app.models.paypal_action import PayPalAction

    Base.metadata.create_all(bind=engine)
