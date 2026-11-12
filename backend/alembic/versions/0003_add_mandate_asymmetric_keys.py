"""add_mandate_asymmetric_keys

Revision ID: 0003_add_mandate_asymmetric_keys
Revises: 0002_add_users_and_api_keys
Create Date: 2026-11-12 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '0003_add_mandate_asymmetric_keys'
down_revision: Union[str, Sequence[str], None] = '0002_add_users_and_api_keys'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update mandates table
    with op.batch_alter_table('mandates', schema=None) as batch_op:
        batch_op.add_column(sa.Column('public_key', sa.String(length=128), nullable=True))
        batch_op.add_column(sa.Column('key_id', sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column('signature_algorithm', sa.String(length=32), nullable=False, server_default='ed25519'))

    # 2. User Keys Table
    op.create_table(
        'user_keys',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('key_id', sa.String(length=64), nullable=False),
        sa.Column('public_key', sa.String(length=128), unique=True, nullable=False),
        sa.Column('algorithm', sa.String(length=32), nullable=False, server_default='ed25519'),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='ACTIVE'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True)
    )
    op.create_index('ix_user_keys_user_id', 'user_keys', ['user_id'])
    op.create_index('ix_user_keys_key_id', 'user_keys', ['key_id'])
    op.create_index('ix_user_keys_public_key', 'user_keys', ['public_key'])
    op.create_index('ix_user_keys_user_status', 'user_keys', ['user_id', 'status'])


def downgrade() -> None:
    op.drop_index('ix_user_keys_user_status', table_name='user_keys')
    op.drop_index('ix_user_keys_public_key', table_name='user_keys')
    op.drop_index('ix_user_keys_key_id', table_name='user_keys')
    op.drop_index('ix_user_keys_user_id', table_name='user_keys')
    op.drop_table('user_keys')

    with op.batch_alter_table('mandates', schema=None) as batch_op:
        batch_op.drop_column('signature_algorithm')
        batch_op.drop_column('key_id')
        batch_op.drop_column('public_key')
