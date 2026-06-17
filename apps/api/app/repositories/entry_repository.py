from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entry import Entry
from app.schemas.entry import EntryCreate, EntryUpdate


class EntryRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_all(self, user_id: UUID) -> list[Entry]:
        # SEGURIDAD: siempre filtrar por user_id.
        # Un usuario nunca debe poder leer entradas de otro usuario.
        raise NotImplementedError

    async def get_by_id(self, entry_id: UUID, user_id: UUID) -> Entry | None:
        # SEGURIDAD: filtrar por entry_id Y user_id.
        raise NotImplementedError

    async def create(self, user_id: UUID, data: EntryCreate) -> Entry:
        entry = Entry(
            user_id=user_id,
            title=data.title,
            type=data.type,
            status=data.status,
            rating=data.rating,
            year=data.year,
            notes=data.notes,
            cover_image=data.cover_image,
        )
        self.db.add(entry)
        try:
            await self.db.commit()
            await self.db.refresh(entry)
            return entry
        except IntegrityError:
            await self.db.rollback()
            raise

    async def update(self, entry_id: UUID, user_id: UUID, data: EntryUpdate) -> Entry | None:
        raise NotImplementedError

    async def delete(self, entry_id: UUID, user_id: UUID) -> bool:
        raise NotImplementedError
