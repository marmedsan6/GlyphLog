from __future__ import annotations

import enum
import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class EntryType(str, enum.Enum):
    anime = "anime"
    manga = "manga"
    game = "game"


class EntryStatus(str, enum.Enum):
    watching = "watching"
    completed = "completed"
    on_hold = "on_hold"
    dropped = "dropped"
    plan_to_watch = "plan_to_watch"


class Entry(Base, TimestampMixin):
    __tablename__ = "entries"
    __table_args__ = (
        Index("uq_entries_user_title_type", "user_id", "title", "type", unique=True),
        # Índice compuesto para filtrar por user_id y ordenar por created_at DESC
        # en listados paginados de forma eficiente.
        Index("ix_entries_user_id_created_at", "user_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    type: Mapped[EntryType] = mapped_column(Enum(EntryType, name="entry_type"), nullable=False)
    status: Mapped[EntryStatus] = mapped_column(
        Enum(EntryStatus, name="entry_status"), nullable=False
    )

    # Campos opcionales — enriquecen la entrada pero no son requeridos
    rating: Mapped[Decimal | None] = mapped_column(Numeric(precision=3, scale=1), nullable=True)
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_image: Mapped[str | None] = mapped_column(String(500), nullable=True)

    user: Mapped[User] = relationship(back_populates="entries")
