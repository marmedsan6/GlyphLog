"""
Servicio de descubrimiento de contenido desde canales de YouTube.

Orquesta el análisis de vídeos de YouTube usando Bedrock/Claude para extraer
menciones de anime/manga/juegos, cruza con la colección del usuario y enriquece
con catálogos externos (AniList/RAWG).
"""

import logging
from datetime import datetime
from typing import Any
from uuid import UUID

from app.integrations.bedrock.client import BedrockClient
from app.integrations.youtube.client import YouTubeClient
from app.repositories.entry_repository import EntryRepository
from app.schemas.youtube_discovery import AnalysisMetadata, YoutubeSuggestion

logger = logging.getLogger(__name__)


class YoutubeDiscoveryService:
    """Servicio para analizar canales de YouTube y extraer sugerencias."""

    def __init__(
        self,
        youtube_client: YouTubeClient,
        bedrock_client: BedrockClient,
        entry_repo: EntryRepository,
    ):
        """
        Inicializa el servicio.

        Args:
            youtube_client: Cliente de YouTube Data API
            bedrock_client: Cliente de Bedrock/Claude
            entry_repo: Repositorio de entradas para cruce con colección
        """
        self.youtube_client = youtube_client
        self.bedrock_client = bedrock_client
        self.entry_repo = entry_repo

    async def analyze_channels(
        self,
        user_id: UUID,
        channel_urls: list[str],
    ) -> tuple[list[YoutubeSuggestion], AnalysisMetadata]:
        """
        Analiza canales de YouTube y genera sugerencias de contenido.

        Proceso:
        1. Extrae channel IDs de las URLs
        2. Obtiene últimos 20 vídeos de cada canal
        3. Extrae transcripts de los vídeos
        4. Analiza transcripts con Claude/Bedrock
        5. Cruza con colección del usuario
        6. Enriquece con catálogos externos (futuro)

        Args:
            user_id: UUID del usuario autenticado
            channel_urls: Lista de URLs de canales (máximo 5)

        Returns:
            Tupla con (lista de sugerencias, metadata del análisis)

        Raises:
            ValueError: Si algún canal no es válido
        """
        logger.info(
            f"Iniciando análisis de {len(channel_urls)} canales para user {user_id}"
        )

        channels_analyzed = 0
        videos_analyzed = 0
        all_videos: list[dict[str, Any]] = []

        # Paso 1 y 2: Obtener vídeos de cada canal
        for channel_url in channel_urls:
            channel_id = self.youtube_client.extract_channel_id(channel_url)
            if not channel_id:
                logger.warning(f"No se pudo extraer channel ID de: {channel_url}")
                continue

            channel_info = self.youtube_client.get_channel_info(channel_id)
            if not channel_info:
                logger.warning(f"No se pudo obtener info del canal: {channel_id}")
                continue

            videos = self.youtube_client.get_recent_videos(channel_id, max_results=20)
            if not videos:
                logger.warning(f"No se encontraron vídeos para canal: {channel_id}")
                continue

            # Agregar nombre del canal a cada vídeo
            for video in videos:
                video["channel_name"] = channel_info["title"]

            all_videos.extend(videos)
            channels_analyzed += 1
            videos_analyzed += len(videos)

        if not all_videos:
            logger.warning("No se encontraron vídeos en ningún canal")
            return [], AnalysisMetadata(
                channels_analyzed=0,
                videos_analyzed=0,
                titles_found=0,
                new_suggestions=0,
                tokens_used=0,
                analyzed_at=datetime.utcnow(),
            )

        # Paso 3: Extraer transcripts
        videos_with_transcripts = []
        for video in all_videos:
            transcript = self.youtube_client.get_video_transcript(video["video_id"])

            # Fallback: usar título + descripción si no hay transcript
            if not transcript:
                transcript = f"{video['title']}. {video['description']}"

            video["transcript"] = transcript
            videos_with_transcripts.append(video)

        logger.info(
            f"Transcripts obtenidos para {len(videos_with_transcripts)} vídeos"
        )

        # Paso 4: Analizar con Claude/Bedrock
        mentions = await self._analyze_with_claude(videos_with_transcripts)

        if not mentions:
            logger.warning("Claude no extrajo ninguna mención")
            return [], AnalysisMetadata(
                channels_analyzed=channels_analyzed,
                videos_analyzed=videos_analyzed,
                titles_found=0,
                new_suggestions=0,
                tokens_used=0,
                analyzed_at=datetime.utcnow(),
            )

        # Paso 5: Cruzar con colección del usuario
        user_entries = await self.entry_repo.get_all(
            user_id=user_id,
            entry_type=None,
            search=None,
            sort_by="created_at",
            sort_order="desc",
            limit=1000,
            offset=0,
        )

        user_titles = {entry.title.lower() for entry in user_entries}

        suggestions = []
        for mention in mentions:
            in_collection = mention["title"].lower() in user_titles

            suggestion = YoutubeSuggestion(
                title=mention["title"],
                type=mention["type"],
                mentioned_by=mention["channel_name"],
                video_title=mention["video_title"],
                video_url=mention["video_url"],
                opinion=mention["opinion"],
                rating=mention.get("rating"),
                timestamp=mention.get("timestamp"),
                in_collection=in_collection,
                external_url=None,  # TODO: enriquecer con AniList/RAWG
                cover_image_url=None,  # TODO: enriquecer con AniList/RAWG
            )
            suggestions.append(suggestion)

        new_suggestions = sum(1 for s in suggestions if not s.in_collection)

        metadata = AnalysisMetadata(
            channels_analyzed=channels_analyzed,
            videos_analyzed=videos_analyzed,
            titles_found=len(mentions),
            new_suggestions=new_suggestions,
            tokens_used=0,  # TODO: calcular tokens reales de Bedrock
            analyzed_at=datetime.utcnow(),
        )

        logger.info(
            f"Análisis completado: {len(suggestions)} sugerencias, "
            f"{new_suggestions} nuevas"
        )

        return suggestions, metadata

    async def _analyze_with_claude(
        self,
        videos: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """
        Analiza transcripts de vídeos con Claude/Bedrock.

        Args:
            videos: Lista de vídeos con transcripts

        Returns:
            Lista de menciones extraídas
        """
        # Construir prompt con todos los vídeos
        videos_text = []
        for idx, video in enumerate(videos, 1):
            videos_text.append(
                f"VIDEO {idx}: \"{video['title']}\"\n"
                f"CHANNEL: {video['channel_name']}\n"
                f"URL: {video['url']}\n"
                f"TRANSCRIPT: {video['transcript'][:2000]}\n"  # Limitar a 2000 chars por vídeo
            )

        videos_prompt = "\n---\n".join(videos_text)

        system_prompt = """You are a content analyzer for YouTube videos about anime, manga, and videogames.
Extract mentions of specific anime/manga/game titles from these video transcripts.

IMPORTANT:
1. Extract ONLY explicit mentions of specific titles (not generic statements like "I love anime")
2. Determine if the mention is positive, mixed, or negative
3. Extract numerical ratings if explicitly stated (e.g., "9 out of 10", "8/10")
4. Estimate timestamp based on position in transcript (optional, best effort)
5. Normalize title to canonical English name

Return ONLY a JSON array of mentions. No additional text."""

        user_prompt = f"""Analyze these YouTube video transcripts from anime/manga/gaming channels.
Extract mentions of specific anime/manga/videogame titles with their opinions.

{videos_prompt}

For each title mentioned, extract:
- title (string, canonical name)
- type (anime | manga | game)
- opinion (positive | mixed | negative)
- rating (integer 1-10 if explicitly mentioned, else null)
- timestamp (string, approximate time in video where mentioned, e.g., "12:34", or null)
- channel_name (string, from the VIDEO metadata above)
- video_title (string, from the VIDEO metadata above)
- video_url (string, from the VIDEO metadata above)

Return ONLY a JSON array of mentions, no additional text.
Example format:
[
  {{
    "title": "Death Note",
    "type": "anime",
    "opinion": "positive",
    "rating": 9,
    "timestamp": "3:42",
    "channel_name": "The Anime Man",
    "video_title": "Top 10 Psychological Thrillers",
    "video_url": "https://www.youtube.com/watch?v=..."
  }}
]"""

        try:
            response = self.bedrock_client.invoke_json(
                prompt=user_prompt,
                temperature=0.3,  # Más determinista para extracción
                system=system_prompt,
            )

            if not isinstance(response, list):
                logger.error(f"Respuesta de Claude no es un array: {type(response)}")
                return []

            # Validar y filtrar menciones válidas
            valid_mentions = []
            for mention in response:
                if not isinstance(mention, dict):
                    continue

                # Validar campos requeridos
                required_fields = [
                    "title",
                    "type",
                    "opinion",
                    "channel_name",
                    "video_title",
                    "video_url",
                ]
                if not all(field in mention for field in required_fields):
                    logger.warning(f"Mención inválida (faltan campos): {mention}")
                    continue

                # Validar tipo
                if mention["type"] not in ["anime", "manga", "game"]:
                    logger.warning(f"Tipo inválido: {mention['type']}")
                    continue

                # Validar opinión
                if mention["opinion"] not in ["positive", "mixed", "negative"]:
                    logger.warning(f"Opinión inválida: {mention['opinion']}")
                    continue

                valid_mentions.append(mention)

            logger.info(f"Claude extrajo {len(valid_mentions)} menciones válidas")
            return valid_mentions

        except Exception as e:
            logger.error(f"Error al analizar con Claude: {e}")
            return []

    @staticmethod
    def format_suggestions_as_text(suggestions: list[YoutubeSuggestion]) -> str:
        """Serializa la lista de sugerencias a texto legible para el agente.

        Este texto se persiste como `content` del mensaje `assistant`, de modo
        que en turnos posteriores entra al historial y GlyphAI puede refinar la
        lista (filtrar, descartar, pedir más).
        """
        if not suggestions:
            return "No encontré menciones de anime/manga/videojuegos en esos canales."
        lines = [f"Estas son las {len(suggestions)} menciones que he encontrado:"]
        for suggestion in suggestions:
            status = "ya en tu lista" if suggestion.in_collection else "nuevo"
            lines.append(
                f"- {suggestion.title} ({suggestion.type.value}, {status}) "
                f"mencionado por {suggestion.mentioned_by} en \"{suggestion.video_title}\""
            )
        return "\n".join(lines)
