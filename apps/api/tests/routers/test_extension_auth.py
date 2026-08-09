"""Tests para autorización de extensión (device tokens).

Valida que device tokens puedan crear entradas y buscar en catálogo,
pero NO puedan editar, borrar ni uploadear imágenes.
"""

import pytest
from fastapi import status
from httpx import AsyncClient

from app.models.entry import EntryStatus, EntryType
from app.models.user import User


@pytest.mark.asyncio(loop_scope="session")
class TestDeviceTokenExtensionAuth:
    """Tests de autenticación device token para extensión."""

    async def test_device_token_can_list_entries(
        self,
        client: AsyncClient,
        user_with_device: tuple[User, str],
    ) -> None:
        """Device token puede listar entradas."""
        user, device_token = user_with_device

        response = await client.get(
            "/api/v1/entries/",
            headers={"Authorization": f"Bearer {device_token}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "entries" in data
        assert "total" in data

    async def test_device_token_can_create_entry_formdata(
        self,
        client: AsyncClient,
        user_with_device: tuple[User, str],
    ) -> None:
        """Device token puede crear entrada vía FormData (sin imagen)."""
        user, device_token = user_with_device

        form_data = {
            "title": "Jujutsu Kaisen",
            "type": EntryType.anime.value,
            "status": EntryStatus.watching.value,
            "rating": "9.5",
            "progress_total": "24",
        }

        response = await client.post(
            "/api/v1/entries/",
            data=form_data,
            headers={"Authorization": f"Bearer {device_token}"},
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["id"]
        assert data["title"] == "Jujutsu Kaisen"
        assert data["type"] == EntryType.anime
        assert data["user_id"] == str(user.id)

    async def test_device_token_can_get_entry(
        self,
        client: AsyncClient,
        user_with_device: tuple[User, str],
        entry_factory,
    ) -> None:
        """Device token puede obtener entrada específica."""
        user, device_token = user_with_device
        entry = await entry_factory(user_id=user.id, title="Test Entry")

        response = await client.get(
            f"/api/v1/entries/{entry.id}",
            headers={"Authorization": f"Bearer {device_token}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == str(entry.id)
        assert data["title"] == "Test Entry"

    async def test_device_token_can_update_progress(
        self,
        client: AsyncClient,
        user_with_device: tuple[User, str],
        entry_factory,
    ) -> None:
        """Device token puede actualizar progreso vía POST /entries/{id}/progress."""
        user, device_token = user_with_device
        entry = await entry_factory(
            user_id=user.id,
            title="Anime",
            type=EntryType.anime,
            current_progress=0,
            progress_total=12,
        )

        response = await client.post(
            f"/api/v1/entries/{entry.id}/progress",
            json={"new_value": 5, "note": "Via extension"},
            headers={"Authorization": f"Bearer {device_token}"},
        )

        assert response.status_code == status.HTTP_200_OK, response.text
        data = response.json()
        assert data["current_progress"] == 5

    async def test_device_token_cannot_update_entry(
        self,
        client: AsyncClient,
        user_with_device: tuple[User, str],
        entry_factory,
    ) -> None:
        """Device token NO puede actualizar entrada vía PUT."""
        user, device_token = user_with_device
        entry = await entry_factory(user_id=user.id, title="Original")

        response = await client.put(
            f"/api/v1/entries/{entry.id}",
            json={"title": "Updated"},
            headers={"Authorization": f"Bearer {device_token}"},
        )

        # El endpoint PUT usa get_current_user (JWT only), debe rechazar device token
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    async def test_device_token_cannot_delete_entry(
        self,
        client: AsyncClient,
        user_with_device: tuple[User, str],
        entry_factory,
    ) -> None:
        """Device token NO puede borrar entrada."""
        user, device_token = user_with_device
        entry = await entry_factory(user_id=user.id, title="To Delete")

        response = await client.delete(
            f"/api/v1/entries/{entry.id}",
            headers={"Authorization": f"Bearer {device_token}"},
        )

        # DELETE usa get_current_user (JWT only)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    async def test_device_token_cannot_upload_cover(
        self,
        client: AsyncClient,
        user_with_device: tuple[User, str],
        entry_factory,
    ) -> None:
        """Device token NO puede uploadear portada."""
        user, device_token = user_with_device
        entry = await entry_factory(user_id=user.id)

        response = await client.post(
            f"/api/v1/entries/{entry.id}/cover",
            files={"cover_image": ("test.png", b"fake image data")},
            headers={"Authorization": f"Bearer {device_token}"},
        )

        # POST /cover usa get_current_user (JWT only)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    async def test_device_token_cannot_reset_progress(
        self,
        client: AsyncClient,
        user_with_device: tuple[User, str],
        entry_factory,
    ) -> None:
        """Device token NO puede resetear progreso."""
        user, device_token = user_with_device
        entry = await entry_factory(
            user_id=user.id,
            type=EntryType.anime,
            current_progress=5,
        )

        response = await client.post(
            f"/api/v1/entries/{entry.id}/progress/reset",
            json={"mode": "full"},
            headers={"Authorization": f"Bearer {device_token}"},
        )

        # POST /progress/reset usa get_current_user (JWT only)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    async def test_device_token_can_search_external(
        self,
        client: AsyncClient,
        user_with_device: tuple[User, str],
    ) -> None:
        """Device token puede buscar en catálogo externo."""
        user, device_token = user_with_device

        response = await client.get(
            "/api/v1/external/search?q=Jujutsu",
            headers={"Authorization": f"Bearer {device_token}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # El resultado depende de AniList, pero debe haber una respuesta válida
        assert "results" in data or "anime" in data or "manga" in data

    async def test_device_token_can_get_game_detail(
        self,
        client: AsyncClient,
        user_with_device: tuple[User, str],
    ) -> None:
        """Device token puede obtener detalle de juego (RAWG)."""
        user, device_token = user_with_device

        # Usamos un slug ficticio; el endpoint debe devolver algo
        response = await client.get(
            "/api/v1/external/games/elden-ring",
            headers={"Authorization": f"Bearer {device_token}"},
        )

        # Esperamos 200 o 404, pero no 401
        assert response.status_code in (status.HTTP_200_OK, status.HTTP_404_NOT_FOUND)

    async def test_jwt_still_works_for_all_endpoints(
        self,
        client: AsyncClient,
        user_with_jwt: tuple[User, str],
        entry_factory,
    ) -> None:
        """JWT sigue funcionando en todos los endpoints (compatibilidad)."""
        user, jwt_token = user_with_jwt
        entry = await entry_factory(user_id=user.id, title="Test")

        # GET /entries
        response = await client.get(
            "/api/v1/entries/",
            headers={"Authorization": f"Bearer {jwt_token}"},
        )
        assert response.status_code == status.HTTP_200_OK

        # POST /entries
        response = await client.post(
            "/api/v1/entries/",
            data={
                "title": "New Entry",
                "type": EntryType.anime.value,
                "status": EntryStatus.watching.value,
            },
            headers={"Authorization": f"Bearer {jwt_token}"},
        )
        assert response.status_code == status.HTTP_201_CREATED

        # PUT /entries/{id}
        response = await client.put(
            f"/api/v1/entries/{entry.id}",
            json={"rating": "8.0"},
            headers={"Authorization": f"Bearer {jwt_token}"},
        )
        assert response.status_code == status.HTTP_200_OK

        # DELETE /entries/{id}
        response = await client.delete(
            f"/api/v1/entries/{entry.id}",
            headers={"Authorization": f"Bearer {jwt_token}"},
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
