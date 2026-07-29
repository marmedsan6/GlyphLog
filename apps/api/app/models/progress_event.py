from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.enums import ProgressEventType, ProgressUnit

if TYPE_CHECKING:
    from app.models.entry import Entry
    from app.models.user import User


class ProgressEvent(Base):
    __tablename__ = "progress_events"
    __table_args__ = (
        # Índice para consultar historial de una entrada ordenado por fecha
        # y para decidir rápidamente si existe historial (SELECT 1 LIMIT 1).
        Index("ix_progress_events_entry_id_recorded_at", "entry_id", "recorded_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    entry_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("entries.id", ondelete="CASCADE"),
        nullable=False,
    )
    # Valor previo al evento. NULL en el primer evento si no hay valor anterior.
    previous_value: Mapped[Decimal | None] = mapped_column(
        Numeric(precision=10, scale=2), nullable=True
    )
    # Valor después del evento. Siempre requerido.
    current_value: Mapped[Decimal] = mapped_column(Numeric(precision=10, scale=2), nullable=False)
    # Unidad en la que se registró el evento.
    unit: Mapped[ProgressUnit] = mapped_column(
        Enum(ProgressUnit, name="progress_unit"), nullable=False
    )
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    # Nota opcional (por ejemplo, motivo de un reset).
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Origen del evento: web, import, api, etc.
    source: Mapped[str] = mapped_column(String(50), nullable=False, default="web")
    event_type: Mapped[ProgressEventType] = mapped_column(
        Enum(ProgressEventType, name="progress_event_type"), nullable=False
    )
    # Usuario que registró el evento. SET NULL para conservar auditoría
    # si la cuenta de usuario se elimina.
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    entry: Mapped[Entry] = relationship(back_populates="progress_events")
    user: Mapped[User | None] = relationship(back_populates="progress_events")
