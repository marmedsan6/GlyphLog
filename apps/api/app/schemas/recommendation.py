"""Schemas para el sistema de recomendaciones."""

from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.entry import EntryType


class Recommendation(BaseModel):
    """Recomendación generada por Claude."""

    title: str = Field(..., description="Título de la obra")
    type: EntryType = Field(..., description="Tipo de entrada")
    match_percentage: int = Field(..., ge=0, le=100, description="Porcentaje de match (0-100)")
    reason: str = Field(..., description="Razón de la recomendación")
    genres: list[str] = Field(default_factory=list, description="Géneros")
    year: int | None = Field(None, ge=1900, le=2100, description="Año")
    external_url: str | None = Field(None, description="URL externa (AniList/RAWG)")
    cover_image_url: str | None = Field(None, description="URL de la imagen de portada")
    similar_to: list[str] = Field(default_factory=list, description="Títulos similares de la colección")


class RecommendationMetadata(BaseModel):
    """Metadata de la generación de recomendaciones."""

    analyzed_entries: int = Field(..., ge=0, description="Entradas analizadas")
    favorite_genres: list[str] = Field(default_factory=list, description="Géneros favoritos")
    avg_rating: float = Field(..., ge=0, le=10, description="Rating promedio")
    completion_rate: float = Field(..., ge=0, le=100, description="Tasa de completado (%)")
    tokens_used: int | None = Field(None, ge=0, description="Tokens consumidos")
    model: str = Field(..., description="Modelo usado")


class GenerateRecommendationsRequest(BaseModel):
    """Request para generar recomendaciones."""

    type: EntryType | None = Field(None, description="Filtrar por tipo")
    limit: int = Field(10, ge=1, le=20, description="Número de recomendaciones")


class GenerateRecommendationsResponse(BaseModel):
    """Response de generación de recomendaciones."""

    recommendations: list[Recommendation] = Field(..., description="Recomendaciones")
    metadata: RecommendationMetadata = Field(..., description="Metadata")
