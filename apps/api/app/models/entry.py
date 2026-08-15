from __future__ import annotations

import enum
import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    JSON,
    CheckConstraint,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin
from app.models.enums import ProgressUnit

if TYPE_CHECKING:
    from app.models.progress_event import ProgressEvent
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


VALID_UNITS_BY_TYPE: dict[EntryType, list[ProgressUnit]] = {
    EntryType.anime: [ProgressUnit.episodes],
    EntryType.manga: [ProgressUnit.chapters],
    EntryType.game: [ProgressUnit.hours],
}

# Unidad fija de progreso derivada del tipo de entrada.
FIXED_UNIT_BY_TYPE: dict[EntryType, ProgressUnit] = {
    EntryType.anime: ProgressUnit.episodes,
    EntryType.manga: ProgressUnit.chapters,
    EntryType.game: ProgressUnit.hours,
}


class Entry(Base, TimestampMixin):
    __tablename__ = "entries"

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
    # Géneros de la obra (ej. ["Action", "Drama"]). Primer campo JSON del
    # proyecto: se auto-popula desde el catálogo (AniList/RAWG) al crear/importar.
    genres: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)

    # Configuración de seguimiento de progreso (ADR-008)
    progress_unit: Mapped[ProgressUnit | None] = mapped_column(
        Enum(ProgressUnit, name="progress_unit"), nullable=True
    )
    progress_total: Mapped[Decimal | None] = mapped_column(
        Numeric(precision=10, scale=2), nullable=True
    )
    current_progress: Mapped[Decimal | None] = mapped_column(
        Numeric(precision=10, scale=2), nullable=True, default=0
    )

    user: Mapped[User] = relationship(back_populates="entries")
    progress_events: Mapped[list[ProgressEvent]] = relationship(
        back_populates="entry",
        cascade="all, delete-orphan",
        order_by="ProgressEvent.recorded_at.desc()",
    )

    __table_args__ = (
        Index("uq_entries_user_title_type", "user_id", "title", "type", unique=True),
        # Índice compuesto para filtrar por user_id y ordenar por created_at DESC
        # en listados paginados de forma eficiente.
        Index("ix_entries_user_id_created_at", "user_id", "created_at"),
        # Evitar valores negativos en progreso total y actual.
        CheckConstraint(
            "progress_total IS NULL OR progress_total >= 0",
            name="ck_entries_progress_total_ge_zero",
        ),
        CheckConstraint(
            "current_progress IS NULL OR current_progress >= 0",
            name="ck_entries_current_progress_ge_zero",
        ),
        # El total, si existe, debe ser mayor o igual que el progreso actual.
        CheckConstraint(
            (
                "progress_total IS NULL OR current_progress IS NULL "
                "OR current_progress <= progress_total"
            ),
            name="ck_entries_progress_lte_total",
        ),
    )
