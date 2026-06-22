import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

# Directorio de uploads — se crea bajo demanda (no en import time)
# para evitar PermissionError cuando el named volume de Docker
# tiene permisos de root y la app corre como appuser.
UPLOAD_DIR = Path("uploads/covers")

# Tamaño máximo: 5MB
MAX_FILE_SIZE = 5 * 1024 * 1024


def _ensure_upload_dir() -> None:
    """Crea el directorio de uploads si no existe. Lanza 500 si falla."""
    try:
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    except PermissionError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error de permisos al crear directorio de uploads. Contacta al administrador.",
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


async def save_cover_image(file: UploadFile) -> str:
    """Valida y guarda una imagen de portada. Retorna la ruta relativa."""
    _ensure_upload_dir()

    # Leer el contenido completo para validar magic bytes y tamaño
    content = await file.read()

    # Validar magic bytes — no confiar en content_type del cliente
    extension = _detect_extension(content)
    if extension is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Formato de imagen no válido. Usa JPG, PNG o WebP.",
        )

    # Validar tamaño
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="La imagen no puede superar los 5MB.",
        )

    # Generar nombre único con UUID para evitar colisiones
    filename = f"{uuid.uuid4()}{extension}"
    filepath = UPLOAD_DIR / filename

    filepath.write_bytes(content)

    # Retornar ruta relativa para almacenar en BD y servir estáticamente
    return f"/uploads/covers/{filename}"
