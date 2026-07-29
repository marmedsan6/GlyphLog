from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import ProgressEventType, ProgressUnit
from app.models.progress_event import ProgressEvent
from app.schemas.progress import ProgressEventCreate


class ProgressEventRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def has_events(self, entry_id: UUID) -> bool:
        """Devuelve True si la entrada tiene al menos un evento de progreso."""
        stmt = select(ProgressEvent).where(ProgressEvent.entry_id == entry_id).limit(1)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def get_history(
        self,
        entry_id: UUID,
        limit: int = 20,
        cursor: datetime | None = None,
    ) -> list[ProgressEvent]:
        """Devuelve eventos de progreso ordenados por recorded_at DESC.

        Usa cursor-based pagination.
        """

        stmt = select(ProgressEvent).where(ProgressEvent.entry_id == entry_id)
        if cursor is not None:
            stmt = stmt.where(ProgressEvent.recorded_at < cursor)
        stmt = stmt.order_by(ProgressEvent.recorded_at.desc(), ProgressEvent.id.desc()).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def create(
        self,
        entry_id: UUID,
        user_id: UUID | None,
        data: ProgressEventCreate,
    ) -> ProgressEvent:
        event = ProgressEvent(
            entry_id=entry_id,
            user_id=user_id,
            previous_value=data.previous_value,
            current_value=data.current_value,
            unit=data.unit,
            note=data.note,
            source=data.source,
            event_type=data.event_type,
        )
        self.db.add(event)
        await self.db.flush()
        await self.db.refresh(event)
        return event

    async def create_reset(
        self,
        entry_id: UUID,
        user_id: UUID | None,
        previous_value: Decimal | None,
        new_unit: ProgressUnit,
        reason: str | None,
    ) -> ProgressEvent:
        note = reason
        if note:
            note = f"Reinicio del seguimiento: {note}"
        else:
            note = "Reinicio del seguimiento"
        return await self.create(
            entry_id=entry_id,
            user_id=user_id,
            data=ProgressEventCreate(
                previous_value=float(previous_value) if previous_value is not None else None,
                current_value=0,
                unit=new_unit,
                note=note,
                source="web",
                event_type=ProgressEventType.reset,
            ),
        )

