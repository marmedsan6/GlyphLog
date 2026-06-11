from __future__ import annotations

import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, String
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

    user: Mapped[User] = relationship(back_populates="entries")
