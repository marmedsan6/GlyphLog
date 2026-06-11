from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers.auth import router as auth_router
from app.routers.entries import router as entries_router


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    # Startup: inicializar recursos si fuera necesario
    yield
    # Shutdown: liberar recursos al cerrar


app = FastAPI(
    title="GlyphLog API",
    description="API REST para gestionar colecciones de anime, manga y videojuegos.",
    version="0.1.0",
    lifespan=lifespan,
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


@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    """Endpoint de salud para monitoring y Docker HEALTHCHECK. No requiere autenticación."""
    return {"status": "ok"}


app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(entries_router, prefix="/api/v1/entries", tags=["entries"])
