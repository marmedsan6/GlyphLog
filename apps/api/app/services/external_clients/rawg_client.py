import logging

import httpx

from app.models.entry import EntryType
from app.schemas.external_search import ExternalSearchResult

logger = logging.getLogger(__name__)


class RawgClient:
    BASE_URL = "https://api.rawg.io/api"

    def __init__(self, api_key: str) -> None:
        self.api_key = api_key

    async def search_games(
        self, client: httpx.AsyncClient, query: str
    ) -> list[ExternalSearchResult] | None:
        if not self.api_key:
            logger.info("RAWG_API_KEY no configurada. Omitiendo búsqueda de videojuegos.")
            return []

        try:
            response = await client.get(
                f"{self.BASE_URL}/games",
                params={"search": query, "key": self.api_key, "page_size": 5},
                timeout=5.0
            )
            if response.status_code != 200:
                logger.warning(f"RAWG search returned status {response.status_code}")
                return None

            data = response.json().get("results", [])
            results = []
            for item in data:
                title = item.get("name") or "Sin título"

                # Extraer año de la fecha de lanzamiento (released: "2013-09-17")
                year = None
                released = item.get("released")
                if released and isinstance(released, str) and "-" in released:
                    try:
                        year = int(released.split("-")[0])
                    except ValueError:
                        pass

                cover_image = item.get("background_image")

                results.append(
                    ExternalSearchResult(
                        title=title,
                        year=year,
                        cover_image=cover_image,
                        type=EntryType.game,
                        source="RAWG"
                    )
                )
            return results
        except Exception as e:
            logger.error(f"Error querying RAWG games: {str(e)}")
            return None
