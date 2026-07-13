from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entry import Entry, EntryType
from app.schemas.entry import EntryCreate, EntryUpdate, SortField, SortOrder


class EntryRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    def _base_query(
        self,
        user_id: UUID,
        entry_type: EntryType | None = None,
        search: str | None = None,
    ) -> Select[tuple[Entry]]:
        """Construye la query base con filtro obligatorio por user_id."""
        stmt = select(Entry).where(Entry.user_id == user_id)
        if entry_type is not None:
            stmt = stmt.where(Entry.type == entry_type)
        if search is not None and search.strip() != "":
            stmt = stmt.where(Entry.title.ilike(f"%{search.strip()}%"))
        return stmt

    async def get_all(
        self,
        user_id: UUID,
        entry_type: EntryType | None = None,
        search: str | None = None,
        sort_by: SortField = SortField.created_at,
        sort_order: SortOrder = SortOrder.desc,
        limit: int = 15,
        offset: int = 0,
    ) -> list[Entry]:
        # Construir ordenamiento dinámico
        sort_field_map = {
            SortField.created_at: Entry.created_at,
            SortField.title: func.lower(Entry.title),
            SortField.rating: Entry.rating,
        }

        column = sort_field_map.get(sort_by, Entry.created_at)

        if sort_order == SortOrder.desc:
            order_expr = column.desc()
        else:
            order_expr = column.asc()

        if sort_by == SortField.rating:
            order_expr = order_expr.nulls_last()

        stmt = (
            self._base_query(user_id, entry_type, search)
            .order_by(order_expr)
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count(
        self,
        user_id: UUID,
        entry_type: EntryType | None = None,
        search: str | None = None,
    ) -> int:
        """Cuenta el total de entradas del usuario, aplicando filtros si aplica."""
        stmt = self._base_query(user_id, entry_type, search).with_only_columns(func.count(Entry.id))
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def get_by_id(self, entry_id: UUID, user_id: UUID) -> Entry | None:
        # SEGURIDAD: filtrar por entry_id Y user_id.
        # Un usuario nunca debe poder acceder a entradas de otro usuario.
        stmt = select(Entry).where(Entry.id == entry_id, Entry.user_id == user_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

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
        # SEGURIDAD: cargar la entrada solo si pertenece al usuario autenticado.
        entry = await self.get_by_id(entry_id, user_id)
        if entry is None:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(entry, field, value)

        try:
            await self.db.commit()
            await self.db.refresh(entry)
            return entry
        except IntegrityError:
            await self.db.rollback()
            raise

    async def delete(self, entry_id: UUID, user_id: UUID) -> bool:
        # SEGURIDAD: eliminar solo si la entrada pertenece al usuario autenticado.
        entry = await self.get_by_id(entry_id, user_id)
        if entry is None:
            return False

        await self.db.delete(entry)
        await self.db.commit()
        return True
