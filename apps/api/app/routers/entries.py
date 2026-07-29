from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.core.dependencies import get_entry_service
from app.core.security import AuthenticatedUser, get_current_user, get_current_user_flexible
from app.core.uploads import save_cover_image
from app.models.entry import EntryType
from app.models.user import User
from app.schemas.entry import (
    EntryCreateForm,
    EntryResponse,
    EntryUpdate,
    PaginatedEntryResponse,
    SortField,
    SortOrder,
)
from app.schemas.progress import (
    PaginatedProgressHistoryResponse,
    ProgressResetRequest,
    ProgressUpdateRequest,
)
from app.services.entry_service import EntryService, InvalidPaginationError

router = APIRouter()


@router.get("/", response_model=PaginatedEntryResponse)
async def list_entries(
    type: EntryType | None = None,
    search: str | None = None,
    sort_by: SortField = SortField.created_at,
    sort_order: SortOrder = SortOrder.desc,
    page: int = 1,
    limit: int = 15,
    auth: AuthenticatedUser = Depends(get_current_user_flexible),
    service: EntryService = Depends(get_entry_service),
) -> PaginatedEntryResponse:
    try:
        return await service.get_all(
            user_id=auth.id,
            entry_type=type,
            search=search,
            sort_by=sort_by,
            sort_order=sort_order,
            page=page,
            limit=limit,
        )
    except InvalidPaginationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(exc),
        ) from exc


@router.post("/", response_model=EntryResponse, status_code=status.HTTP_201_CREATED)
async def create_entry(
    form_data: EntryCreateForm = Depends(),
    cover_image: UploadFile | None = File(None),
    auth: AuthenticatedUser = Depends(get_current_user_flexible),
    service: EntryService = Depends(get_entry_service),
) -> EntryResponse | JSONResponse:
    # Validar datos del formulario PRIMERO (antes de guardar archivos)
    # para evitar archivos huérfanos en disco si la validación falla.
    try:
        data = form_data.to_entry_create()
    except (ValidationError, ValueError) as exc:
        if isinstance(exc, ValidationError):
            messages = [err.get("msg", "Error de validación") for err in exc.errors()]
            detail = "; ".join(messages)
        else:
            detail = str(exc)
        return JSONResponse(status_code=422, content={"detail": detail})

    # Guardar imagen SOLO si la validación pasó
    if cover_image is not None:
        cover_image_path = await save_cover_image(cover_image)
        data.cover_image = cover_image_path

    return await service.create(user_id=auth.id, data=data)


@router.get("/{entry_id}", response_model=EntryResponse)
async def get_entry(
    entry_id: UUID,
    auth: AuthenticatedUser = Depends(get_current_user_flexible),
    service: EntryService = Depends(get_entry_service),
) -> EntryResponse:
    return await service.get_by_id(entry_id=entry_id, user_id=auth.id)


@router.put("/{entry_id}", response_model=EntryResponse)
async def update_entry(
    entry_id: UUID,
    data: EntryUpdate,
    current_user: User = Depends(get_current_user),
    service: EntryService = Depends(get_entry_service),
) -> EntryResponse:
    return await service.update(entry_id=entry_id, user_id=current_user.id, data=data)


@router.post("/{entry_id}/cover", response_model=EntryResponse)
async def upload_cover_image(
    entry_id: UUID,
    cover_image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    service: EntryService = Depends(get_entry_service),
) -> EntryResponse:
    return await service.update_cover_image(
        entry_id=entry_id,
        user_id=current_user.id,
        file=cover_image,
    )


@router.post("/{entry_id}/progress/reset", response_model=EntryResponse)
async def reset_progress(
    entry_id: UUID,
    data: ProgressResetRequest,
    current_user: User = Depends(get_current_user),
    service: EntryService = Depends(get_entry_service),
) -> EntryResponse:
    return await service.reset_progress(
        entry_id=entry_id,
        user_id=current_user.id,
        data=data,
    )


@router.post("/{entry_id}/progress", response_model=EntryResponse)
async def update_progress(
    entry_id: UUID,
    data: ProgressUpdateRequest,
    auth: AuthenticatedUser = Depends(get_current_user_flexible),
    service: EntryService = Depends(get_entry_service),
) -> EntryResponse:
    return await service.update_progress(
        entry_id=entry_id,
        user_id=auth.id,
        data=data,
        source=auth.source,
    )


@router.get("/{entry_id}/progress/history", response_model=PaginatedProgressHistoryResponse)
async def get_progress_history(
    entry_id: UUID,
    limit: int = 20,
    cursor: str | None = None,
    current_user: User = Depends(get_current_user),
    service: EntryService = Depends(get_entry_service),
) -> PaginatedProgressHistoryResponse:
    return await service.get_progress_history(
        entry_id=entry_id,
        user_id=current_user.id,
        limit=limit,
        cursor=cursor,
    )


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)

async def delete_entry(
    entry_id: UUID,
    current_user: User = Depends(get_current_user),
    service: EntryService = Depends(get_entry_service),
) -> None:
    await service.delete(entry_id=entry_id, user_id=current_user.id)
