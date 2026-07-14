"""extend_food_catalog_and_logs

Revision ID: b1c2d3e4f5a6
Revises: a340e1c652ef
Create Date: 2026-07-13 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, Sequence[str], None] = "a340e1c652ef"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("food_items", sa.Column("category", sa.String(length=32), server_default="food", nullable=True))
    op.add_column("food_items", sa.Column("is_drink", sa.Boolean(), server_default=sa.text("0"), nullable=True))
    op.add_column("food_items", sa.Column("source", sa.String(length=32), server_default="system", nullable=True))
    op.add_column("food_items", sa.Column("user_id", sa.Integer(), nullable=True))
    op.add_column("food_items", sa.Column("brand", sa.Text(), nullable=True))
    op.add_column("food_items", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("food_items", sa.Column("serving_label", sa.Text(), nullable=True))
    op.create_index("ix_food_items_category", "food_items", ["category"], unique=False)
    op.create_index("ix_food_items_is_drink", "food_items", ["is_drink"], unique=False)
    op.create_index("ix_food_items_user_id", "food_items", ["user_id"], unique=False)
    op.create_index("ix_food_items_name", "food_items", ["name"], unique=False)
    op.create_index("ix_food_items_name_category", "food_items", ["name", "category"], unique=False)
    try:
        op.create_foreign_key("fk_food_items_user_id", "food_items", "users", ["user_id"], ["id"])
    except Exception:
        pass

    op.add_column("food_logs", sa.Column("meal_name", sa.Text(), nullable=True))
    op.create_index("ix_food_logs_user_id", "food_logs", ["user_id"], unique=False)
    op.create_index("ix_food_logs_user_logged", "food_logs", ["user_id", "logged_at"], unique=False)

    # Backfill: mark milk as drink if present
    op.execute("UPDATE food_items SET category='drink', is_drink=1 WHERE lower(name) LIKE '%milk%'")
    op.execute("UPDATE food_items SET category=COALESCE(category, 'food'), is_drink=COALESCE(is_drink, 0), source=COALESCE(source, 'system')")


def downgrade() -> None:
    op.drop_index("ix_food_logs_user_logged", table_name="food_logs")
    try:
        op.drop_index("ix_food_logs_user_id", table_name="food_logs")
    except Exception:
        pass
    op.drop_column("food_logs", "meal_name")

    try:
        op.drop_constraint("fk_food_items_user_id", "food_items", type_="foreignkey")
    except Exception:
        pass
    op.drop_index("ix_food_items_name_category", table_name="food_items")
    try:
        op.drop_index("ix_food_items_name", table_name="food_items")
    except Exception:
        pass
    op.drop_index("ix_food_items_user_id", table_name="food_items")
    op.drop_index("ix_food_items_is_drink", table_name="food_items")
    op.drop_index("ix_food_items_category", table_name="food_items")
    op.drop_column("food_items", "serving_label")
    op.drop_column("food_items", "description")
    op.drop_column("food_items", "brand")
    op.drop_column("food_items", "user_id")
    op.drop_column("food_items", "source")
    op.drop_column("food_items", "is_drink")
    op.drop_column("food_items", "category")
