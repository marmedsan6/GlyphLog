"""Cliente para la API de IGDB (Internet Game Database) vía Twitch.

IGDB reemplaza a RawgClient como fuente de catálogo de videojuegos. Es gratis
para uso no comercial y usa OAuth2 client-credentials de Twitch para obtener un
access token que luego se envía en las peticiones Apicalypse.

Requisitos de credenciales (obtenidas en https://dev.twitch.tv/console/apps):
  - Client ID + Client Secret (app de tipo "Confidential")
  - Cuenta de Twitch con 2FA activado
"""

import asyncio
import logging
import time
from datetime import datetime, timezone

import httpx

from app.models.entry import EntryType
from app.schemas.external_search import ExternalSearchResult

logger = logging.getLogger(__name__)

TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token"
IGDB_BASE_URL = "https://api.igdb.com/v4"
IGDB_COVER_URL = "https://images.igdb.com/igdb/image/upload/t_cover_big/{image_id}.jpg"

# Token de OAuth caduca pasados `expires_in` segundos (~62 días en client
# credentials). Refrescamos con un margen de seguridad de 1 hora.
TOKEN_EXPIRY_MARGIN_SECONDS = 3600


def _epoch_to_year(epoch: int | None) -> int | None:
    """Convierte el epoch en segundos de IGDB (first_release_date) a año."""
    if not epoch:
        return None
    try:
        return datetime.fromtimestamp(epoch, tz=timezone.utc).year
    except (OverflowError, OSError, ValueError):
        return None


class IgdbClient:
    def __init__(self, client_id: str, client_secret: str) -> None:
        self.client_id = client_id
        self.client_secret = client_secret
        # Token cacheado en memoria; se refresca al expirar.
        self._access_token: str | None = None
        self._token_expires_at: float = 0.0
        # Evita un thundering herd si varias corrutinas detectan el token caducado.
        self._token_lock = asyncio.Lock()

    @property
    def _configured(self) -> bool:
        return bool(self.client_id and self.client_secret)

    async def _get_access_token(self, client: httpx.AsyncClient) -> str | None:
        """Obtiene (o refresca) el access token OAuth2 de Twitch."""
        now = time.time()
        if self._access_token and now < self._token_expires_at:
            return self._access_token

        async with self._token_lock:
            # Re-comprobamos dentro del lock por si otro coroutine ya lo obtuvo.
            if self._access_token and now < self._token_expires_at:
                return self._access_token

            try:
                response = await client.post(
                    TWITCH_TOKEN_URL,
                    params={
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                        "grant_type": "client_credentials",
                    },
                    timeout=10.0,
                )
                if response.status_code != 200:
                    logger.warning(
                        f"Twitch OAuth returned status {response.status_code}: {response.text}"
                    )
                    return None

                body = response.json()
                self._access_token = body.get("access_token")
                expires_in = int(body.get("expires_in", 0))
                self._token_expires_at = (
                    now + max(expires_in - TOKEN_EXPIRY_MARGIN_SECONDS, 0)
                )
                return self._access_token

            except (httpx.RequestError, httpx.TimeoutException) as e:
                logger.error(f"Error obteniendo token de Twitch: {e}")
                return None
            except Exception as e:
                logger.error(f"Error inesperado obteniendo token de Twitch: {e}")
                return None

    def _headers(self, access_token: str) -> dict[str, str]:
        return {
            "Client-ID": self.client_id,
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        }

    async def search_games(
        self, client: httpx.AsyncClient, query: str
    ) -> list[ExternalSearchResult] | None:
        """Busca videojuegos en IGDB.

        Retorna una lista de resultados o None si hubo un error de red/API.
        Si las credenciales no están configuradas retorna [] (sin búsqueda).
        """
        if not self._configured:
            logger.info("IGDB no configurado. Omitiendo búsqueda de videojuegos.")
            return []

        access_token = await self._get_access_token(client)
        if not access_token:
            return None

        # `version_parent = null` excluye ediciones (Collector's Edition, etc.)
        # para no devolver duplicados de un mismo juego base.
        body = (
            f'fields name,slug,first_release_date,genres.name,cover.image_id; '
            f'search "{query}"; limit 5; where version_parent = null;'
        )

        try:
            response = await client.post(
                f"{IGDB_BASE_URL}/games",
                headers=self._headers(access_token),
                content=body,
                timeout=5.0,
            )
            if response.status_code != 200:
                logger.warning(f"IGDB search returned status {response.status_code}")
                return None

            data = response.json()
            results: list[ExternalSearchResult] = []
            for item in data:
                title = item.get("name") or "Sin título"
                genres = [g.get("name") for g in item.get("genres", []) if g.get("name")]
                cover = item.get("cover") or {}
                image_id = cover.get("image_id")

                results.append(
                    ExternalSearchResult(
                        title=title,
                        year=_epoch_to_year(item.get("first_release_date")),
                        cover_image=(
                            IGDB_COVER_URL.format(image_id=image_id) if image_id else None
                        ),
                        type=EntryType.game,
                        source="IGDB",
                        slug=item.get("slug"),
                        genres=genres,
                    )
                )
            return results

        except (httpx.RequestError, httpx.TimeoutException) as e:
            logger.error(f"Error querying IGDB games: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error querying IGDB games: {e}")
            return None
