"""
Schemas para el sistema de descubrimiento desde YouTube.

Define las estructuras de datos para análisis de canales, sugerencias
y metadata del proceso de análisis con Claude/Bedrock.
"""

from datetime import datetime

from pydantic import BaseModel, Field, HttpUrl

from app.models.entry import EntryType


class YoutubeSuggestion(BaseModel):
    """
    Sugerencia de contenido extraída del análisis de vídeos de YouTube.

    Representa un anime/manga/juego mencionado por un YouTuber, con contexto
    sobre el vídeo, opinión del creador y si ya está en la colección del usuario.
    """

    title: str = Field(..., description="Título del anime/manga/juego mencionado")
    type: EntryType = Field(..., description="Tipo de entrada: anime, manga o game")
    mentioned_by: str = Field(..., description="Nombre del canal que lo mencionó")
    video_title: str = Field(..., description="Título del vídeo donde se mencionó")
    video_url: HttpUrl = Field(..., description="URL del vídeo de YouTube")
    opinion: str = Field(
        ...,
        description="Opinión del YouTuber: 'positive', 'mixed' o 'negative'",
    )
    rating: int | None = Field(
        None,
        ge=1,
        le=10,
        description="Rating explícito del YouTuber (1-10), si lo mencionó",
    )
    timestamp: str | None = Field(
        None,
        description="Timestamp aproximado en el vídeo (ej: '12:34')",
    )
    in_collection: bool = Field(
        ...,
        description="True si el usuario ya tiene este título en su colección",
    )
    external_url: HttpUrl | None = Field(
        None,
        description="URL del título en AniList/RAWG para más info",
    )
    cover_image_url: HttpUrl | None = Field(
        None,
        description="URL de la imagen de portada desde AniList/RAWG",
    )


class AnalysisMetadata(BaseModel):
    """
    Metadata sobre el proceso de análisis de canales de YouTube.

    Proporciona transparencia al usuario sobre el alcance del análisis,
    recursos consumidos y resultados obtenidos.
    """

    channels_analyzed: int = Field(
        ...,
        ge=0,
        description="Número de canales procesados",
    )
    videos_analyzed: int = Field(
        ...,
        ge=0,
        description="Número total de vídeos analizados",
    )
    titles_found: int = Field(
        ...,
        ge=0,
        description="Número total de títulos encontrados",
    )
    new_suggestions: int = Field(
        ...,
        ge=0,
        description="Títulos NO presentes en la colección del usuario",
    )
    tokens_used: int = Field(
        ...,
        ge=0,
        description="Tokens consumidos en la llamada a Bedrock/Claude",
    )
    analyzed_at: datetime = Field(
        ...,
        description="Timestamp del análisis",
    )


class YoutubeAnalysisRequest(BaseModel):
    """Request body para analizar canales de YouTube."""

    channel_urls: list[str] = Field(
        ...,
        min_length=1,
        max_length=5,
        description="URLs de canales de YouTube (máximo 5)",
    )


class YoutubeAnalysisResponse(BaseModel):
    """Response del análisis de canales de YouTube."""

    suggestions: list[YoutubeSuggestion] = Field(
        ...,
        description="Lista de sugerencias extraídas",
    )
    metadata: AnalysisMetadata = Field(
        ...,
        description="Metadata del análisis",
    )
