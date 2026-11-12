"""add_deliverable_store_fields

Revision ID: 0004_add_deliverable_store_fields
Revises: 0003_add_mandate_asymmetric_keys
Create Date: 2026-11-12 12:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '0004_add_deliverable_store'
down_revision: Union[str, Sequence[str], None] = '0003_add_mandate_asymmetric_keys'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('deliverables', schema=None) as batch_op:
        batch_op.add_column(sa.Column('sha256', sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column('file_name', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('file_size_bytes', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('content_type', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('extracted_text', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('inspection_status', sa.String(length=30), nullable=True, server_default='INSPECTED'))
        batch_op.create_index('ix_deliverables_sha256', ['sha256'])


def downgrade() -> None:
    with op.batch_alter_table('deliverables', schema=None) as batch_op:
        batch_op.drop_index('ix_deliverables_sha256')
        batch_op.drop_column('inspection_status')
        batch_op.drop_column('extracted_text')
        batch_op.drop_column('content_type')
        batch_op.drop_column('file_size_bytes')
        batch_op.drop_column('file_name')
        batch_op.drop_column('sha256')

