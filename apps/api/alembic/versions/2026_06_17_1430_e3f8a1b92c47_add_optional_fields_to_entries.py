"""add optional fields to entries

Revision ID: e3f8a1b92c47
Revises: adc57cb8eb31
Create Date: 2026-06-17 14:30:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e3f8a1b92c47"
down_revision: Union[str, None] = "adc57cb8eb31"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "entries",
        sa.Column("rating", sa.Numeric(precision=3, scale=1), nullable=True),
    )
    op.add_column(
        "entries",
        sa.Column("year", sa.Integer(), nullable=True),
    )
    op.add_column(
        "entries",
        sa.Column("notes", sa.Text(), nullable=True),
    )
    op.add_column(
        "entries",
        sa.Column("cover_image", sa.String(length=500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("entries", "cover_image")
    op.drop_column("entries", "notes")
    op.drop_column("entries", "year")
    op.drop_column("entries", "rating")
