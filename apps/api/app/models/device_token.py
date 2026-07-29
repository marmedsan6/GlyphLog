from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class DeviceToken(Base, TimestampMixin):
    """Token de acceso limitado para dispositivos externos (extensión Chrome).

    Cada device token representa un emparejamiento entre un usuario y un
    dispositivo externo. El token se almacena hasheado (SHA-256) y solo se
    muestra en texto plano una vez durante la activación.

    Flujo:
    1. El usuario genera un código de emparejamiento desde la SPA (POST /devices/pair).
    2. El código se introduce en la extensión, que lo activa (POST /devices/activate).
    3. La extensión recibe un device_token y lo usa para autenticarse.
    4. El usuario puede revocar el token desde la SPA (DELETE /devices/{id}).
    """

    __tablename__ = "device_tokens"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    # Nombre descriptivo del dispositivo ("Chrome Work", "Chrome Home").
    device_name: Mapped[str] = mapped_column(String(50), nullable=False)
    # SHA-256 del token. El token nunca se almacena en texto plano.
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    # Última vez que se usó el token para una petición autenticada.
    last_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Fecha de expiración. Los tokens expiran a los 90 días de su creación.
    # Se renueva automáticamente (90 días desde last_used_at) al usar el token.
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    # Si el usuario revocó el token manualmente desde la SPA.
    is_revoked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # Código de emparejamiento efímero (6 chars, uppercase alfanumérico).
    # Se establece al crear, se borra al activar (NULL tras activación).
    pairing_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    # Cuándo expira el código de emparejamiento (5 minutos tras generarlo).
    pairing_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    user: Mapped[User] = relationship(back_populates="device_tokens")

    __table_args__ = (
        Index("ix_device_tokens_user_id", "user_id"),
        # Índice parcial para buscar códigos de emparejamiento activos.
        # Solo indexa filas donde pairing_code no es NULL (pre-activación).
        Index(
            "ix_device_tokens_pairing_code",
            "pairing_code",
            unique=True,
            postgresql_where="pairing_code IS NOT NULL",
        ),
    )
