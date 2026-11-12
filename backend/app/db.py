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
    from app.models.user import User
    from app.models.api_key import APIKey
    from app.models.user_key import UserKey

    if settings.APP_ENV in ("demo", "test"):
        Base.metadata.create_all(bind=engine)
        if db_url.startswith("sqlite"):
            with engine.connect() as conn:
                try:
                    res = conn.exec_driver_sql("PRAGMA table_info(mandates)").fetchall()
                    existing_cols = {row[1] for row in res}
                    if "public_key" not in existing_cols:
                        conn.exec_driver_sql("ALTER TABLE mandates ADD COLUMN public_key VARCHAR(128)")
                    if "key_id" not in existing_cols:
                        conn.exec_driver_sql("ALTER TABLE mandates ADD COLUMN key_id VARCHAR(64)")
                    if "signature_algorithm" not in existing_cols:
                        conn.exec_driver_sql("ALTER TABLE mandates ADD COLUMN signature_algorithm VARCHAR(32) DEFAULT 'hmac-sha256'")

                    res_deliv = conn.exec_driver_sql("PRAGMA table_info(deliverables)").fetchall()
                    existing_deliv_cols = {row[1] for row in res_deliv}
                    if "sha256" not in existing_deliv_cols:
                        conn.exec_driver_sql("ALTER TABLE deliverables ADD COLUMN sha256 VARCHAR(64)")
                    if "file_name" not in existing_deliv_cols:
                        conn.exec_driver_sql("ALTER TABLE deliverables ADD COLUMN file_name VARCHAR(255)")
                    if "file_size_bytes" not in existing_deliv_cols:
                        conn.exec_driver_sql("ALTER TABLE deliverables ADD COLUMN file_size_bytes INTEGER")
                    if "content_type" not in existing_deliv_cols:
                        conn.exec_driver_sql("ALTER TABLE deliverables ADD COLUMN content_type VARCHAR(100)")
                    if "extracted_text" not in existing_deliv_cols:
                        conn.exec_driver_sql("ALTER TABLE deliverables ADD COLUMN extracted_text TEXT")
                    if "inspection_status" not in existing_deliv_cols:
                        conn.exec_driver_sql("ALTER TABLE deliverables ADD COLUMN inspection_status VARCHAR(30) DEFAULT 'INSPECTED'")

                    conn.commit()
                except Exception:
                    pass
    else:
        import os
        from alembic.config import Config
        from alembic import command

        backend_dir = os.path.dirname(os.path.dirname(__file__))
        ini_path = os.path.join(backend_dir, "alembic.ini")
        if not os.path.exists(ini_path):
            ini_path = os.path.join(os.path.dirname(backend_dir), "alembic.ini")

        alembic_cfg = Config(ini_path)
        alembic_cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
        command.upgrade(alembic_cfg, "head")
