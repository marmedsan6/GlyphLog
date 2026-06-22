from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.entry import Entry


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    # Nunca almacenar contraseñas en texto plano.
    # Solo contiene el hash bcrypt generado por security.hash_password().
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    entries: Mapped[list[Entry]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
