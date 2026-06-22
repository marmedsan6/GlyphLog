"""create users and entries tables

Revision ID: bff6f11d7171
Revises: 
Create Date: 2026-06-10 10:22:02.155069

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "bff6f11d7171"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_table(
        "entries",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column(
            "type",
            sa.Enum("anime", "manga", "game", name="entry_type"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum(
                "watching",
                "completed",
                "on_hold",
                "dropped",
                "plan_to_watch",
                name="entry_status",
            ),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_entries_user_id"), "entries", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_entries_user_id"), table_name="entries")
    op.drop_table("entries")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
    # Alembic no elimina automáticamente los tipos enum de PostgreSQL.
    # Sin esto, un upgrade posterior fallaría con "type already exists".
    sa.Enum(name="entry_type").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="entry_status").drop(op.get_bind(), checkfirst=True)
