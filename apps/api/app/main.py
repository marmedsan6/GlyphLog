import traceback
from pathlib import Path

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.rate_limiter import limiter
from app.routers.ai import router as ai_router
from app.routers.auth import router as auth_router
from app.routers.devices import router as devices_router
from app.routers.entries import router as entries_router
from app.routers.external_search import router as external_search_router
from app.routers.import_router import router as import_router
from app.routers.profile import router as profile_router
from app.routers.recommendations import router as recommendations_router
from app.routers.stats import router as stats_router
from app.routers.youtube_discovery import router as youtube_discovery_router

app = FastAPI(
    title="GlyphLog API",
    description="API REST para gestionar colecciones de anime, manga y videojuegos.",
    version="0.1.0",
    # Swagger y ReDoc solo activos con DEBUG=true.
    # En producción (DEBUG=false) se deshabilitan completamente.
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json" if settings.debug else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,  # Lista explícita — nunca ["*"] en producción
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

# Rate limiting — se vincula vía app.state.limiter; solo aplica a endpoints con @limiter.limit()
app.state.limiter = limiter


# --- Exception handlers globales ---


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Maneja HTTPExceptions (404, 401, 403, etc.) con formato JSON consistente."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Retorna 429 con mensaje en español y header Retry-After cuando se supera el límite."""
    # exc.limit.limit es un RateLimitItem de la librería `limits`;
    # get_expiry() devuelve el período en segundos (ej: 60 para "por minuto").
    retry_after = exc.limit.limit.get_expiry() if exc.limit and exc.limit.limit else 60
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={"detail": f"Demasiadas peticiones. Intenta de nuevo en {retry_after} segundos."},
        headers={"Retry-After": str(retry_after)},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Maneja errores de validación de Pydantic con formato JSON."""
    errors = exc.errors()
    messages = [err.get("msg", "Error de validación") for err in errors]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "; ".join(messages)},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Maneja errores inesperados con 500. Muestra traceback solo en debug."""
    error_detail = traceback.format_exc() if settings.debug else "Internal server error"
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": error_detail},
    )


@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    """Endpoint de salud para monitoring y Docker HEALTHCHECK. No requiere autenticación."""
    return {"status": "ok"}


app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(entries_router, prefix="/api/v1/entries", tags=["entries"])
app.include_router(profile_router, prefix="/api/v1/users", tags=["profile"])
app.include_router(external_search_router, prefix="/api/v1", tags=["external-search"])
app.include_router(devices_router, prefix="/api/v1/devices", tags=["devices"])
app.include_router(import_router, prefix="/api/v1", tags=["import"])
app.include_router(recommendations_router, prefix="/api/v1", tags=["recommendations"])
app.include_router(stats_router, prefix="/api/v1", tags=["stats"])
app.include_router(
    youtube_discovery_router,
    prefix="/api/v1/discover/youtube",
    tags=["youtube-discovery"],
)
app.include_router(ai_router, prefix="/api/v1", tags=["ai"])

# Servir archivos subidos estáticamente.
# El mount va DESPUÉS de los routers para no interceptar rutas de la API.
_uploads_dir = Path("uploads")
_uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
