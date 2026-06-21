from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.core.dependencies import get_entry_service
from app.core.security import get_current_user
from app.core.uploads import save_cover_image
from app.models.entry import EntryStatus, EntryType
from app.models.user import User
from app.schemas.entry import EntryCreate, EntryResponse, EntryUpdate, PaginatedEntryResponse
from app.services.entry_service import EntryService, InvalidPaginationError

router = APIRouter()


@router.get("/", response_model=PaginatedEntryResponse)
async def list_entries(
    type: EntryType | None = None,
    page: int = 1,
    limit: int = 15,
    current_user: User = Depends(get_current_user),
    service: EntryService = Depends(get_entry_service),
) -> PaginatedEntryResponse:
    try:
        return await service.get_all(
            user_id=current_user.id,
            entry_type=type,
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
    title: str = Form(""),
    type: str = Form(...),
    status: str = Form(...),
    rating: str | None = Form(None),
    year: str | None = Form(None),
    notes: str | None = Form(None),
    cover_image: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user),
    service: EntryService = Depends(get_entry_service),
) -> EntryResponse:
    # Conversión explícita str → float/int.
    # Los formularios multipart envían todos los valores como strings;
    # declarar str | None es honesto con los tipos y evita type: ignore.
    rating_value: float | None = float(rating) if rating else None
    year_value: int | None = int(year) if year else None
    notes_value: str | None = notes if notes else None

    # Validar datos del formulario PRIMERO (antes de guardar archivos)
    # para evitar archivos huérfanos en disco si la validación falla.
    try:
        data = EntryCreate(
            title=title,
            type=EntryType(type),
            status=EntryStatus(status),
            rating=rating_value,
            year=year_value,
            notes=notes_value,
            cover_image=None,
        )
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

    return await service.create(user_id=current_user.id, data=data)


@router.get("/{entry_id}", response_model=EntryResponse)
async def get_entry(
    entry_id: UUID,
    current_user: User = Depends(get_current_user),
    service: EntryService = Depends(get_entry_service),
) -> EntryResponse:
    return await service.get_by_id(entry_id=entry_id, user_id=current_user.id)


@router.patch("/{entry_id}", response_model=EntryResponse)
async def update_entry(
    entry_id: UUID,
    data: EntryUpdate,
    current_user: User = Depends(get_current_user),
    service: EntryService = Depends(get_entry_service),
) -> EntryResponse:
    return await service.update(entry_id=entry_id, user_id=current_user.id, data=data)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entry(
    entry_id: UUID,
    current_user: User = Depends(get_current_user),
    service: EntryService = Depends(get_entry_service),
) -> None:
    await service.delete(entry_id=entry_id, user_id=current_user.id)
