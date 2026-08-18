"""
Cliente para YouTube Data API v3 y extracción de transcripts.

Proporciona funcionalidades para:
- Obtener información de canales
- Listar vídeos recientes de un canal
- Extraer transcripts/subtítulos de vídeos
"""

import logging
import re
from datetime import datetime, timedelta
from typing import Any

from cachetools import TTLCache
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    NoTranscriptFound,
    TranscriptsDisabled,
    VideoUnavailable,
)

logger = logging.getLogger(__name__)


class YouTubeClient:
    """Cliente para interactuar con YouTube Data API v3 y transcripts."""

    def __init__(self, api_key: str):
        """
        Inicializa el cliente de YouTube.

        Args:
            api_key: API Key de YouTube Data API v3
        """
        self.api_key = api_key
        self.youtube = build("youtube", "v3", developerKey=api_key)

        # Caché de vídeos: 24h (evita agotar quota de YouTube API)
        self.video_cache: TTLCache[str, dict[str, Any]] = TTLCache(
            maxsize=100,
            ttl=86400,  # 24 horas
        )

        logger.info("YouTubeClient inicializado")

    def extract_channel_id(self, channel_url: str) -> str | None:
        """
        Extrae el channel ID de una URL de YouTube.

        Soporta formatos:
        - https://www.youtube.com/channel/UC...
        - https://www.youtube.com/@username
        - https://www.youtube.com/c/channelname
        - https://youtube.com/user/username

        Args:
            channel_url: URL del canal

        Returns:
            Channel ID si se encuentra, None si no se puede extraer
        """
        # Formato: /channel/UCxxxxx
        channel_match = re.search(r"/channel/([a-zA-Z0-9_-]+)", channel_url)
        if channel_match:
            return channel_match.group(1)

        # Formato: /@username → buscar por handle directo
        handle_match = re.search(r"/@([a-zA-Z0-9_.-]+)", channel_url)
        if handle_match:
            handle = handle_match.group(1)
            return self._get_channel_id_by_handle(handle)

        # Formato: /c/channelname o /user/username → búsqueda por forUsername / query
        legacy_match = re.search(r"/(c|user)/([a-zA-Z0-9_.-]+)", channel_url)
        if legacy_match:
            name = legacy_match.group(2)
            return self._get_channel_id_by_username_or_search(name)

        logger.warning(f"No se pudo extraer channel ID de: {channel_url}")
        return None

    def _get_channel_id_by_handle(self, handle: str) -> str | None:
        """
        Obtiene el ID del canal usando el endpoint oficial forHandle (exacto y 1 unidad de quota).
        Si no se encuentra, hace fallback a search.
        """
        clean_handle = handle.lstrip("@")
        try:
            response = (
                self.youtube.channels()
                .list(
                    part="id",
                    forHandle=clean_handle,
                )
                .execute()
            )
            items = response.get("items", [])
            if items:
                channel_id = items[0]["id"]
                logger.info(f"forHandle @{clean_handle} → Channel ID: {channel_id}")
                return channel_id
        except HttpError as e:
            logger.debug(f"forHandle no encontró @{clean_handle}: {e}")

        return self._search_channel_by_handle(f"@{clean_handle}")

    def _get_channel_id_by_username_or_search(self, username: str) -> str | None:
        """
        Obtiene el ID del canal por forUsername (exacto). Fallback a search.
        """
        try:
            response = (
                self.youtube.channels()
                .list(
                    part="id",
                    forUsername=username,
                )
                .execute()
            )
            items = response.get("items", [])
            if items:
                channel_id = items[0]["id"]
                logger.info(f"forUsername {username} → Channel ID: {channel_id}")
                return channel_id
        except HttpError as e:
            logger.debug(f"forUsername no encontró {username}: {e}")

        return self._search_channel_by_handle(username)

    def _search_channel_by_handle(self, handle: str) -> str | None:
        """
        Busca un canal por su handle o nombre.

        Args:
            handle: Handle del canal (ej: @TheAnimeMan) o nombre

        Returns:
            Channel ID si se encuentra, None si no existe
        """
        try:
            # Intentar buscar por handle usando la API de búsqueda
            search_response = (
                self.youtube.search()
                .list(
                    part="snippet",
                    q=handle,
                    type="channel",
                    maxResults=1,
                )
                .execute()
            )

            items = search_response.get("items", [])
            if items:
                channel_id = items[0]["id"]["channelId"]
                logger.info(f"Handle {handle} → Channel ID: {channel_id}")
                return channel_id

            logger.warning(f"No se encontró canal para handle: {handle}")
            return None

        except HttpError as e:
            logger.error(f"Error al buscar canal por handle {handle}: {e}")
            return None

    def get_channel_info(self, channel_id: str) -> dict[str, Any] | None:
        """
        Obtiene información básica de un canal.

        Args:
            channel_id: ID del canal

        Returns:
            Dict con información del canal o None si no existe
        """
        try:
            response = (
                self.youtube.channels()
                .list(
                    part="snippet,statistics",
                    id=channel_id,
                )
                .execute()
            )

            items = response.get("items", [])
            if not items:
                logger.warning(f"Canal no encontrado: {channel_id}")
                return None

            channel = items[0]
            return {
                "id": channel["id"],
                "title": channel["snippet"]["title"],
                "description": channel["snippet"]["description"],
                "subscriber_count": channel["statistics"].get("subscriberCount", "0"),
                "video_count": channel["statistics"].get("videoCount", "0"),
            }

        except HttpError as e:
            logger.error(f"Error al obtener info del canal {channel_id}: {e}")
            return None

    def get_recent_videos(
        self,
        channel_id: str,
        max_results: int = 20,
    ) -> list[dict[str, Any]]:
        """
        Obtiene los vídeos más recientes de un canal.

        Args:
            channel_id: ID del canal
            max_results: Número máximo de vídeos (default: 20)

        Returns:
            Lista de vídeos con información básica
        """
        cache_key = f"{channel_id}:{max_results}"
        if cache_key in self.video_cache:
            logger.debug(f"Videos cacheados para canal {channel_id}")
            return self.video_cache[cache_key]

        try:
            # Buscar vídeos del canal ordenados por fecha
            search_response = (
                self.youtube.search()
                .list(
                    part="id,snippet",
                    channelId=channel_id,
                    type="video",
                    order="date",
                    maxResults=max_results,
                    publishedAfter=(datetime.utcnow() - timedelta(days=180)).isoformat()
                    + "Z",  # Últimos 6 meses
                )
                .execute()
            )

            videos = []
            for item in search_response.get("items", []):
                video = {
                    "video_id": item["id"]["videoId"],
                    "title": item["snippet"]["title"],
                    "description": item["snippet"]["description"],
                    "published_at": item["snippet"]["publishedAt"],
                    "channel_title": item["snippet"]["channelTitle"],
                    "url": f"https://www.youtube.com/watch?v={item['id']['videoId']}",
                }
                videos.append(video)

            self.video_cache[cache_key] = videos
            logger.info(f"Obtenidos {len(videos)} vídeos del canal {channel_id}")
            return videos

        except HttpError as e:
            logger.error(f"Error al obtener vídeos del canal {channel_id}: {e}")
            return []

    def get_video_transcript(
        self,
        video_id: str,
        languages: list[str] | None = None,
    ) -> str | None:
        """
        Extrae el transcript/subtítulos de un vídeo.

        Args:
            video_id: ID del vídeo
            languages: Lista de códigos de idioma preferidos (default: ["en", "es"])

        Returns:
            Transcript como texto plano o None si no disponible
        """
        if languages is None:
            languages = ["en", "es"]

        try:
            # Intentar obtener transcript en los idiomas especificados
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

            # Buscar transcript manual primero (mejor calidad)
            try:
                transcript = transcript_list.find_manually_created_transcript(languages)
            except NoTranscriptFound:
                # Fallback a auto-generado
                try:
                    transcript = transcript_list.find_generated_transcript(languages)
                except NoTranscriptFound:
                    logger.warning(
                        f"No transcript disponible en {languages} para video {video_id}"
                    )
                    return None

            # Obtener el texto del transcript
            transcript_data = transcript.fetch()
            text = " ".join([entry["text"] for entry in transcript_data])

            # Limitar a los primeros 10,000 caracteres (Claude tiene límites)
            if len(text) > 10000:
                text = text[:10000]
                logger.debug(f"Transcript truncado a 10,000 chars para video {video_id}")

            return text

        except (TranscriptsDisabled, VideoUnavailable) as e:
            logger.warning(f"Transcript no disponible para video {video_id}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error al obtener transcript del video {video_id}: {e}")
            return None
