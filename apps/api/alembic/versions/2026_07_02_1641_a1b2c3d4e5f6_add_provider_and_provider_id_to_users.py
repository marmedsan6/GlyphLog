"""add provider and provider_id to users

Revision ID: a1b2c3d4e5f6
Revises: 0447404bbed9
Create Date: 2026-07-02 16:41:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "0447404bbed9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Hacer hashed_password nullable: los usuarios OAuth no tienen contraseña.
    # Los usuarios locales siguen obligándola a nivel de servicio (no de BD),
    # manteniendo la validación de dominio donde corresponde.
    op.alter_column("users", "hashed_password", existing_type=sa.String(length=255), nullable=True)

    op.add_column(
        "users",
        sa.Column("provider", sa.String(length=20), nullable=False, server_default="local"),
    )
    op.add_column("users", sa.Column("provider_id", sa.String(length=255), nullable=True))

    # Índice único parcial: solo aplica a usuarios OAuth (provider_id no nulo).
    # Usuarios locales tienen provider_id = NULL y la unicidad de email ya está
    # cubierta por el constraint unique en users.email. Usamos un índice parcial
    # en lugar de unique(provider, provider_id) para permitir múltiples NULL.
    op.create_index(
        "ix_users_provider_provider_id",
        "users",
        ["provider", "provider_id"],
        unique=True,
        postgresql_where=sa.text("provider_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_users_provider_provider_id", table_name="users")
    op.drop_column("users", "provider_id")
    op.drop_column("users", "provider")
    # Revertir hashed_password a NOT NULL fallaría si existen usuarios OAuth
    # con el campo en NULL. Alembic no añade un check: la reversión manual es
    # responsabilidad del operador.
    op.alter_column("users", "hashed_password", existing_type=sa.String(length=255), nullable=False)
