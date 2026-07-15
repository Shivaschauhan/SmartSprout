"""add user allergies and budget

Revision ID: c5b6d7e8f9a0
Revises: b1c2d3e4f5a6
Create Date: 2026-07-15 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c5b6d7e8f9a0'
down_revision: Union[str, Sequence[str], None] = 'b1c2d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('allergies', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('budget', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'budget')
    op.drop_column('users', 'allergies')
