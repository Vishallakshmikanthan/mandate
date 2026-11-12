"""
Alembic Database Migration Verification Test Suite.
Verifies:
1. Fresh database schema provisioning via `alembic upgrade head`
2. Full schema completeness matching models (users, api_keys, user_keys, deliverable hashes, asymmetric keys)
3. Stepwise upgrade and clean downgrade back to base
"""
import os
import pytest
from sqlalchemy import create_engine, inspect
from alembic.config import Config
from alembic import command


def test_migration_chain_upgrade_and_downgrade(tmp_path):
    """
    Verify complete migration lifecycle from base to head and back:
    - 0001_initial_schema
    - 0002_add_auth_and_ownership
    - 0003_add_mandate_asymmetric_keys
    - 0004_add_deliverable_store_fields
    """
    db_file = tmp_path / "migration_test.db"
    db_url = f"sqlite:///{db_file}"

    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    ini_path = os.path.join(backend_dir, "alembic.ini")
    alembic_cfg = Config(ini_path)
    alembic_cfg.set_main_option("sqlalchemy.url", db_url)

    # 1. Upgrade to head
    command.upgrade(alembic_cfg, "head")

    engine = create_engine(db_url)
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())

    all_expected_tables = {
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
        "users",
        "api_keys",
        "user_keys",
        "alembic_version"
    }

    missing_tables = all_expected_tables - tables
    assert not missing_tables, f"Missing migrated tables: {missing_tables}"

    # 2. Verify critical columns added in Phase 3
    mandate_cols = {c["name"] for c in inspector.get_columns("mandates")}
    assert "public_key" in mandate_cols
    assert "signature_algorithm" in mandate_cols
    assert "key_id" in mandate_cols

    deliverable_cols = {c["name"] for c in inspector.get_columns("deliverables")}
    assert "sha256" in deliverable_cols
    assert "inspection_status" in deliverable_cols
    assert "extracted_text" in deliverable_cols
    assert "file_size_bytes" in deliverable_cols
    assert "content_type" in deliverable_cols

    user_cols = {c["name"] for c in inspector.get_columns("users")}
    assert "password_hash" in user_cols
    assert "role" in user_cols

    api_key_cols = {c["name"] for c in inspector.get_columns("api_keys")}
    assert "key_hash" in api_key_cols
    assert "scopes" in api_key_cols

    # 3. Clean downgrade to base
    command.downgrade(alembic_cfg, "base")
    inspector_post_downgrade = inspect(engine)
    remaining_tables = set(inspector_post_downgrade.get_table_names()) - {"alembic_version"}
    assert not remaining_tables, f"Tables remained after downgrade: {remaining_tables}"
