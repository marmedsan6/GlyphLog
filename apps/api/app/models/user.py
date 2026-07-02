from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.entry import Entry


# El índice único parcial solo aplica a usuarios OAuth (provider != "local").
# Usuarios locales tienen provider_id = NULL y la unicidad de email ya está
# cubierta por el constraint unique en users.email.
# PostgreSQL es el único backend soportado, por eso postgresql_where es seguro.
_ix_users_provider_provider_id = Index(
    "ix_users_provider_provider_id",
    "provider",
    "provider_id",
    unique=True,
    postgresql_where="provider_id IS NOT NULL",
)


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    # Nullable para usuarios OAuth (no tienen contraseña). Los usuarios locales
    # SIEMPRE tienen un hash; la obligatoriedad se valida a nivel de servicio.
    # Nunca almacenar contraseñas en texto plano. Solo contiene el hash bcrypt.
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Identificador del proveedor de identidad. "local" para email/password,
    # "google" para OAuth de Google, etc. Por defecto "local" para mantener
    # compatibilidad con usuarios existentes y con código que crea User(...) sin
    # especificar el provider.
    provider: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="local", default="local"
    )
    # Identificador único del usuario en el proveedor (sub en el caso de Google).
    # NULL para usuarios locales. La unicidad (provider, provider_id) se garantiza
    # con el índice parcial definido a nivel de módulo.
    provider_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    entries: Mapped[list[Entry]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )

    __table_args__ = (_ix_users_provider_provider_id,)
