import uuid
from io import BytesIO
from pathlib import Path
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from PIL import Image

# Directorio de uploads — se crea bajo demanda (no en import time)
# para evitar PermissionError cuando el named volume de Docker
# tiene permisos de root y la app corre como appuser.
UPLOAD_DIR = Path("uploads/covers")
AVATAR_DIR = Path("uploads/avatars")

# Tamaño máximo: 5MB para portadas, 2MB para avatares.
MAX_FILE_SIZE = 5 * 1024 * 1024
MAX_AVATAR_SIZE = 2 * 1024 * 1024


def _ensure_upload_dir() -> None:
    """Crea el directorio de uploads si no existe. Lanza 500 si falla."""
    try:
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    except PermissionError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error de permisos al crear directorio de uploads. Contacta al administrador.",
        )


def _ensure_avatar_dir() -> None:
    """Crea el directorio de avatares si no existe. Lanza 500 si falla."""
    try:
        AVATAR_DIR.mkdir(parents=True, exist_ok=True)
    except PermissionError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error de permisos al crear directorio de avatares. Contacta al administrador.",
        )


def _detect_extension(content: bytes) -> str | None:
    """Detecta el formato de imagen por magic bytes. Retorna extensión o None."""
    if content[:3] == b"\xff\xd8\xff":
        return ".jpg"
    if content[:8] == b"\x89PNG\r\n\x1a\n":
        return ".png"
    if content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return ".webp"
    return None


def _validate_image(content: bytes, max_size: int) -> None:
    """Valida magic bytes y tamaño de una imagen. Lanza 422 si falla."""
    extension = _detect_extension(content)
    if extension is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Formato de imagen no válido. Usa JPG, PNG o WebP.",
        )

    if len(content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"La imagen no puede superar los {max_size // (1024 * 1024)}MB.",
        )


async def save_cover_image(file: UploadFile) -> str:
    """Valida y guarda una imagen de portada. Retorna la ruta relativa."""
    _ensure_upload_dir()

    content = await file.read()
    _validate_image(content, MAX_FILE_SIZE)

    extension = _detect_extension(content)
    filename = f"{uuid.uuid4()}{extension}"
    filepath = UPLOAD_DIR / filename
    filepath.write_bytes(content)

    return f"/uploads/covers/{filename}"


async def save_avatar(file: UploadFile, user_id: UUID) -> str:
    """Valida, convierte a WebP y guarda un avatar. Retorna la ruta relativa."""
    _ensure_avatar_dir()

    content = await file.read()
    _validate_image(content, MAX_AVATAR_SIZE)

    # Convertir siempre a WebP para optimizar tamaño.
    try:
        source_image = Image.open(BytesIO(content))
        rgb_image = source_image.convert("RGB")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="No se pudo procesar la imagen. Asegúrate de que sea un archivo válido.",
        ) from exc

    filename = f"{user_id}.webp"
    filepath = AVATAR_DIR / filename

    rgb_image.save(filepath, format="WEBP", quality=85, method=6)

    return f"/uploads/avatars/{filename}"


def delete_avatar_file(filename: str) -> None:
    """Elimina un archivo de avatar del disco. Ignora si no existe."""
    filepath = AVATAR_DIR / filename
    if filepath.exists():
        filepath.unlink()
