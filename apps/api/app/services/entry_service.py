from datetime import datetime
from math import ceil
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.exc import IntegrityError

from app.core.uploads import save_cover_image
from app.models.entry import FIXED_UNIT_BY_TYPE, Entry, EntryStatus, EntryType
from app.models.enums import ProgressEventType, ProgressUnit
from app.repositories.entry_repository import EntryRepository
from app.repositories.progress_event_repository import ProgressEventRepository
from app.schemas.entry import (
    EntryCreate,
    EntryListItem,
    EntryResponse,
    EntryUpdate,
    PaginatedEntryResponse,
    SortField,
    SortOrder,
)
from app.schemas.progress import (
    PaginatedProgressHistoryResponse,
    ProgressEventCreate,
    ProgressEventResponse,
    ProgressResetRequest,
    ProgressUpdateRequest,
)


class InvalidPaginationError(ValueError):
    """Raised when page or limit parameters are invalid."""


class IncompatibleProgressChangeError(ValueError):
    """Raised when a progress configuration change conflicts with existing history."""


class EntryService:
    MIN_LIMIT = 1
    MAX_LIMIT = 100
    DEFAULT_LIMIT = 15

    def __init__(
        self,
        entry_repo: EntryRepository,
        progress_event_repo: ProgressEventRepository,
    ) -> None:
        self.entry_repo = entry_repo
        self.progress_event_repo = progress_event_repo

    async def get_all(
        self,
        user_id: UUID,
        entry_type: EntryType | None = None,
        search: str | None = None,
        sort_by: SortField = SortField.created_at,
        sort_order: SortOrder = SortOrder.desc,
        page: int = 1,
        limit: int = DEFAULT_LIMIT,
    ) -> PaginatedEntryResponse:
        if page < 1:
            raise InvalidPaginationError("page debe ser mayor o igual a 1")
        if not (self.MIN_LIMIT <= limit <= self.MAX_LIMIT):
            raise InvalidPaginationError(
                f"limit debe estar entre {self.MIN_LIMIT} y {self.MAX_LIMIT}"
            )

        offset = (page - 1) * limit
        entries = await self.entry_repo.get_all(
            user_id=user_id,
            entry_type=entry_type,
            search=search,
            sort_by=sort_by,
            sort_order=sort_order,
            limit=limit,
            offset=offset,
        )
        total = await self.entry_repo.count(user_id=user_id, entry_type=entry_type, search=search)
        total_pages = ceil(total / limit) if total > 0 else 0

        return PaginatedEntryResponse(
            entries=[EntryListItem.model_validate(entry) for entry in entries],
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
        )

    async def get_by_id(self, entry_id: UUID, user_id: UUID) -> EntryResponse:
        entry = await self.entry_repo.get_by_id(entry_id, user_id)
        if entry is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Entrada no encontrada",
            )
        return await self._enrich_with_history(entry)

    def _is_unit_compatible(self, entry_type: EntryType, unit: ProgressUnit | None) -> bool:
        """Comprueba si una unidad es compatible con el tipo de entrada."""
        if unit is None:
            return True
        return unit == FIXED_UNIT_BY_TYPE.get(entry_type)

    def _format_fixed_unit(self, entry_type: EntryType) -> str:
        return FIXED_UNIT_BY_TYPE.get(entry_type, ProgressUnit.episodes).value

    async def _enrich_with_history(self, entry: Entry) -> EntryResponse:
        """Valida el EntryResponse desde un Entry y añade el flag has_history."""
        response = EntryResponse.model_validate(entry)
        response.has_history = await self.progress_event_repo.has_events(entry.id)
        return response

    async def create(self, user_id: UUID, data: EntryCreate) -> EntryResponse:
        # La unidad de progreso se deriva automáticamente del tipo. Si el cliente
        # envía una unidad explícita distinta, se rechaza con 422.
        fixed_unit = FIXED_UNIT_BY_TYPE.get(data.type)
        if data.progress_unit is not None and data.progress_unit != fixed_unit:
            fixed_label = fixed_unit.value if fixed_unit else "ninguna"
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"La unidad '{data.progress_unit}' no es válida para el tipo "
                    f"'{data.type.value}'. Unidad fija: {fixed_label}"
                ),
            )
        # Aplicar la unidad fija por defecto.
        if data.progress_unit is None and fixed_unit is not None:
            data.progress_unit = fixed_unit
        try:
            entry = await self.entry_repo.create(user_id, data)
        except IntegrityError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya tienes esta entrada en tu colección",
            )
        return await self._enrich_with_history(entry)

    async def update(self, entry_id: UUID, user_id: UUID, data: EntryUpdate) -> EntryResponse:
        entry = await self.entry_repo.get_by_id(entry_id, user_id)
        if entry is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Entrada no encontrada",
            )

        effective_type = data.type if data.type is not None else entry.type
        fixed_unit = FIXED_UNIT_BY_TYPE.get(effective_type)
        has_history = await self.progress_event_repo.has_events(entry_id)

        if has_history:
            if data.type is not None and data.type != entry.type:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "La entrada tiene historial de progreso. "
                        "Para cambiar el tipo, confirma Reiniciar seguimiento "
                        "(esto conservará el historial previo y pondrá el progreso actual a 0)."
                    ),
                )
            if data.progress_unit is not None and data.progress_unit != fixed_unit:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "La entrada tiene historial de progreso. "
                        "Para cambiar la unidad, confirma Reiniciar seguimiento "
                        "(esto conservará el historial previo y pondrá el progreso actual a 0)."
                    ),
                )

        if data.progress_unit is not None and data.progress_unit != fixed_unit:
            fixed_label = fixed_unit.value if fixed_unit else "ninguna"
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"La unidad '{data.progress_unit}' no es válida para el tipo "
                    f"'{effective_type.value}'. Unidad fija: {fixed_label}"
                ),
            )

        # Si cambia el tipo y no hay historial, re-derivar la unidad fija.
        if not has_history and data.type is not None and data.type != entry.type:
            data.progress_unit = fixed_unit

        # Validar coherencia entre progreso actual y total cuando solo se envía uno.
        if data.current_progress is not None or data.progress_total is not None:
            new_current = (
                data.current_progress
                if data.current_progress is not None
                else entry.current_progress
            )
            new_total = (
                data.progress_total if data.progress_total is not None else entry.progress_total
            )
            if new_total is not None and new_current is not None and new_current > new_total:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="El progreso actual no puede ser mayor que el total de progreso",
                )

        try:
            updated_entry = await self.entry_repo.update(entry_id, user_id, data)
        except IntegrityError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya tienes una entrada con ese título y tipo",
            )
        if updated_entry is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Entrada no encontrada",
            )
        return await self._enrich_with_history(updated_entry)

    async def update_cover_image(
        self, entry_id: UUID, user_id: UUID, file: UploadFile
    ) -> EntryResponse:
        entry = await self.entry_repo.get_by_id(entry_id, user_id)
        if entry is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Entrada no encontrada",
            )

        # save_cover_image valida magic bytes, formato y tamaño máximo (5MB)
        # y lanza HTTPException 422 si falla alguna validación.
        cover_image_path = await save_cover_image(file)
        updated_entry = await self.entry_repo.update(
            entry_id, user_id, EntryUpdate(cover_image=cover_image_path)
        )
        if updated_entry is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Entrada no encontrada",
            )
        return await self._enrich_with_history(updated_entry)

    async def reset_progress(
        self,
        entry_id: UUID,
        user_id: UUID,
        data: ProgressResetRequest,
    ) -> EntryResponse:
        """Reinicia el seguimiento de una entrada con historial.

        Inserta un evento de tipo reset, pone current_progress a 0 y permite
        cambiar simultáneamente el tipo y/o el total. La unidad se deriva del tipo.
        """
        entry = await self.entry_repo.get_by_id_for_update(entry_id, user_id)
        if entry is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Entrada no encontrada",
            )

        if data.new_type:
            try:
                new_type = EntryType(data.new_type)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Tipo de entrada inválido: '{data.new_type}'",
                ) from exc
        else:
            new_type = entry.type
        new_unit = FIXED_UNIT_BY_TYPE[new_type]
        new_total = (
            data.new_progress_total if data.new_progress_total is not None else entry.progress_total
        )

        previous_value = entry.current_progress

        await self.progress_event_repo.create_reset(
            entry_id=entry_id,
            user_id=user_id,
            previous_value=previous_value,
            new_unit=new_unit,
            reason=data.reason,
        )

        update_payload = EntryUpdate(
            current_progress=0,
            progress_unit=new_unit,
            progress_total=float(new_total) if new_total is not None else None,
        )
        if data.new_type:
            update_payload.type = new_type

        updated_entry = await self.entry_repo.update(entry_id, user_id, update_payload)
        if updated_entry is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Entrada no encontrada",
            )
        return await self._enrich_with_history(updated_entry)

    async def update_progress(
        self,
        entry_id: UUID,
        user_id: UUID,
        data: ProgressUpdateRequest,
        source: str = "web",
    ) -> EntryResponse:
        """Actualiza manualmente el progreso actual de una entrada."""
        entry = await self.entry_repo.get_by_id_for_update(entry_id, user_id)
        if entry is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Entrada no encontrada",
            )

        if entry.progress_unit is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Esta entrada no tiene configurado el seguimiento de progreso.",
            )

        new_value = data.new_value
        if entry.progress_unit != ProgressUnit.hours and new_value != int(new_value):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="El progreso en episodios y capítulos debe ser un número entero",
            )

        if entry.progress_total is not None and new_value > entry.progress_total:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "El progreso actual no puede ser mayor que el total de progreso "
                    f"({entry.progress_total})"
                ),
            )

        # Crear el evento de progreso
        event_data = ProgressEventCreate(
            previous_value=float(entry.current_progress)
            if entry.current_progress is not None
            else None,
            current_value=new_value,
            unit=entry.progress_unit,
            note=data.note,
            source=source,
            event_type=ProgressEventType.update,
        )
        await self.progress_event_repo.create(
            entry_id=entry_id,
            user_id=user_id,
            data=event_data,
        )

        # Actualizar la entrada
        update_payload = EntryUpdate(current_progress=new_value)
        if (
            data.mark_completed
            and entry.progress_total is not None
            and new_value == entry.progress_total
        ):
            update_payload.status = EntryStatus.completed

        updated_entry = await self.entry_repo.update(entry_id, user_id, update_payload)
        if updated_entry is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Entrada no encontrada",
            )

        return await self._enrich_with_history(updated_entry)

    async def get_progress_history(
        self,
        entry_id: UUID,
        user_id: UUID,
        limit: int = 20,
        cursor: str | None = None,
    ) -> PaginatedProgressHistoryResponse:
        """Obtiene el historial de progreso de una entrada propia con cursor-based pagination."""
        entry = await self.entry_repo.get_by_id(entry_id, user_id)
        if entry is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Entrada no encontrada",
            )

        if not (self.MIN_LIMIT <= limit <= self.MAX_LIMIT):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"limit debe estar entre {self.MIN_LIMIT} y {self.MAX_LIMIT}",
            )

        parsed_cursor: datetime | None = None
        if cursor:
            try:
                parsed_cursor = datetime.fromisoformat(cursor)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Formato de cursor inválido. Debe ser una cadena ISO-8601.",
                )

        raw_events = await self.progress_event_repo.get_history(
            entry_id=entry_id,
            limit=limit + 1,
            cursor=parsed_cursor,
        )

        has_more = len(raw_events) > limit
        events_to_return = raw_events[:limit]
        next_cursor = (
            events_to_return[-1].recorded_at.isoformat()
            if has_more and events_to_return
            else None
        )

        return PaginatedProgressHistoryResponse(
            events=[ProgressEventResponse.model_validate(event) for event in events_to_return],
            next_cursor=next_cursor,
            has_more=has_more,
        )

    async def delete(self, entry_id: UUID, user_id: UUID) -> None:

        deleted = await self.entry_repo.delete(entry_id, user_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Entrada no encontrada",
            )
