"""initial_schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-11-12 11:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '0001_initial_schema'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Mandates
    op.create_table(
        'mandates',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('owner_id', sa.String(length=36), nullable=False),
        sa.Column('agent_id', sa.String(length=100), nullable=False),
        sa.Column('policy', sa.JSON(), nullable=False),
        sa.Column('signature', sa.String(length=128), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='ACTIVE'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False)
    )

    # 2. Payment Intents
    op.create_table(
        'payment_intents',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('mandate_id', sa.String(length=36), sa.ForeignKey('mandates.id', ondelete='CASCADE'), nullable=False),
        sa.Column('amount_minor', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False, server_default='USD'),
        sa.Column('counterparty', sa.String(length=255), nullable=False),
        sa.Column('merchant_category', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('decision', sa.String(length=20), nullable=False),
        sa.Column('rule_results', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False)
    )

    # 3. Escrows
    op.create_table(
        'escrows',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('intent_id', sa.String(length=36), sa.ForeignKey('payment_intents.id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('state', sa.String(length=30), nullable=False, server_default='ORDER_CREATED'),
        sa.Column('spec', sa.JSON(), nullable=False),
        sa.Column('paypal_order_id', sa.String(length=100), nullable=True),
        sa.Column('paypal_authorization_id', sa.String(length=100), nullable=True),
        sa.Column('paypal_capture_id', sa.String(length=100), nullable=True),
        sa.Column('hold_expires_at', sa.DateTime(), nullable=True),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False)
    )

    # 4. Deliverables
    op.create_table(
        'deliverables',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('escrow_id', sa.String(length=36), sa.ForeignKey('escrows.id', ondelete='CASCADE'), nullable=False),
        sa.Column('content_ref', sa.Text(), nullable=False),
        sa.Column('submission_notes', sa.Text(), nullable=True),
        sa.Column('submitted_at', sa.DateTime(), nullable=False)
    )

    # 5. Arbiter Verdicts
    op.create_table(
        'arbiter_verdicts',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('escrow_id', sa.String(length=36), sa.ForeignKey('escrows.id', ondelete='CASCADE'), nullable=False),
        sa.Column('verdict', sa.String(length=20), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('criteria_results', sa.JSON(), nullable=False),
        sa.Column('partial_ratio', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('explanation', sa.Text(), nullable=False),
        sa.Column('model', sa.String(length=50), nullable=False),
        sa.Column('prompt_version', sa.String(length=50), nullable=True, server_default='arbiter_v1.0'),
        sa.Column('created_at', sa.DateTime(), nullable=False)
    )

    # 6. Audit Log
    op.create_table(
        'audit_log',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('actor', sa.String(length=50), nullable=False),
        sa.Column('entity_id', sa.String(length=100), nullable=True),
        sa.Column('action', sa.Text(), nullable=False),
        sa.Column('prev_hash', sa.String(length=64), unique=True, index=True, nullable=False),
        sa.Column('event_hash', sa.String(length=64), unique=True, index=True, nullable=False),
        sa.Column('metadata_json', sa.JSON(), nullable=True)
    )

    # 7. Webhook Events
    op.create_table(
        'webhook_events',
        sa.Column('id', sa.String(length=100), primary_key=True),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('resource_id', sa.String(length=100), nullable=False),
        sa.Column('payload', sa.JSON(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='PROCESSED'),
        sa.Column('error_message', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('processed_at', sa.DateTime(), nullable=True)
    )

    # 8. Red Team Runs
    op.create_table(
        'redteam_runs',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('prompt', sa.Text(), nullable=False),
        sa.Column('expected_decision', sa.String(length=20), nullable=False),
        sa.Column('actual_decision', sa.String(length=20), nullable=False),
        sa.Column('rule_triggered', sa.String(length=50), nullable=True),
        sa.Column('passed', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False)
    )

    # 9. Counterparties
    op.create_table(
        'counterparties',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('handle', sa.String(length=100), unique=True, index=True, nullable=False),
        sa.Column('paypal_merchant_id', sa.String(length=100), nullable=True),
        sa.Column('paypal_email', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='VERIFIED'),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False)
    )

    # 10. Spend Ledger
    op.create_table(
        'spend_ledger',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('mandate_id', sa.String(), sa.ForeignKey('mandates.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('intent_id', sa.String(), sa.ForeignKey('payment_intents.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('amount_minor', sa.Integer(), nullable=False),
        sa.Column('kind', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, index=True)
    )

    # 11. PayPal Actions
    op.create_table(
        'paypal_actions',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('escrow_id', sa.String(), nullable=True, index=True),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('request_id', sa.String(), unique=True, index=True, nullable=False),
        sa.Column('request_body', sa.JSON(), nullable=True),
        sa.Column('response_body', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='PENDING'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False)
    )


def downgrade() -> None:
    op.drop_table('paypal_actions')
    op.drop_table('spend_ledger')
    op.drop_table('counterparties')
    op.drop_table('redteam_runs')
    op.drop_table('webhook_events')
    op.drop_table('audit_log')
    op.drop_table('arbiter_verdicts')
    op.drop_table('deliverables')
    op.drop_table('escrows')
    op.drop_table('payment_intents')
    op.drop_table('mandates')

