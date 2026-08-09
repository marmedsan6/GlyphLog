"""Tests para la gestión de dispositivos y tokens de dispositivo (HU 5).

Cubre:
1. Generación de código de emparejamiento (POST /devices/pair)
2. Activación de dispositivo con código (POST /devices/activate)
3. Listado de dispositivos activos (GET /devices/)
4. Revocación de dispositivo (DELETE /devices/{device_id})
5. Autenticación flexible (device token vs JWT)
6. Límite de 5 dispositivos por usuario
"""

from unittest.mock import AsyncMock
from uuid import uuid4

from httpx import AsyncClient

from app.models.device_token import DeviceToken
from app.services.device_token_service import DeviceTokenService
from tests.factories import (
    clear_overrides,
    client,  # noqa: F401
    make_user,
    override_current_user,
)


class TestDevicesEndpoints:
    """Tests para el router /api/v1/devices."""

    async def test_generate_pairing_code_success(self, client: AsyncClient) -> None:
        """Generar código de emparejamiento con usuario autenticado → 201 Created."""
        user = make_user()
        mock_service = AsyncMock(spec=DeviceTokenService)
        mock_service.generate_pairing_code.return_value = {
            "pairing_code": "A3X9K2",
            "expires_in": 300,
        }
        override_current_user(user)

        from app.core.dependencies import get_device_token_service
        from app.main import app

        app.dependency_overrides[get_device_token_service] = lambda: mock_service

        try:
            response = await client.post("/api/v1/devices/pair")

            assert response.status_code == 201
            body = response.json()
            assert body["pairing_code"] == "A3X9K2"
            assert body["expires_in"] == 300
            mock_service.generate_pairing_code.assert_awaited_once_with(user_id=user.id)
        finally:
            clear_overrides()

    async def test_activate_device_success(self, client: AsyncClient) -> None:
        """Activar dispositivo con código de emparejamiento → 200 OK con device_token."""
        device_id = uuid4()
        mock_service = AsyncMock(spec=DeviceTokenService)
        mock_service.activate_device.return_value = {
            "device_token": "dt_1234567890abcdef1234567890abcdef",
            "device_id": str(device_id),
            "device_name": "Extensión Chrome",
        }

        from app.core.dependencies import get_device_token_service
        from app.main import app

        app.dependency_overrides[get_device_token_service] = lambda: mock_service

        try:
            response = await client.post(
                "/api/v1/devices/activate",
                json={
                    "pairing_code": "A3X9K2",
                    "device_name": "Extensión Chrome",
                },
            )

            assert response.status_code == 200
            body = response.json()
            assert body["device_token"].startswith("dt_")
            assert body["device_id"] == str(device_id)
            assert body["device_name"] == "Extensión Chrome"
            mock_service.activate_device.assert_awaited_once_with(
                pairing_code="A3X9K2",
                device_name="Extensión Chrome",
            )
        finally:
            clear_overrides()

    async def test_list_devices_success(self, client: AsyncClient) -> None:
        """Listar dispositivos del usuario autenticado → 200 OK con lista de dispositivos."""
        user = make_user()
        mock_service = AsyncMock(spec=DeviceTokenService)
        mock_service.list_devices.return_value = {
            "devices": [
                {
                    "id": str(uuid4()),
                    "device_name": "Chrome Work",
                    "last_used_at": "2026-07-18T12:00:00Z",
                    "is_revoked": False,
                    "expires_at": "2026-10-18T12:00:00Z",
                    "created_at": "2026-07-18T10:00:00Z",
                }
            ]
        }
        override_current_user(user)

        from app.core.dependencies import get_device_token_service
        from app.main import app

        app.dependency_overrides[get_device_token_service] = lambda: mock_service

        try:
            response = await client.get("/api/v1/devices/")

            assert response.status_code == 200
            body = response.json()
            assert len(body["devices"]) == 1
            assert body["devices"][0]["device_name"] == "Chrome Work"
            mock_service.list_devices.assert_awaited_once_with(user_id=user.id)
        finally:
            clear_overrides()

    async def test_revoke_device_success(self, client: AsyncClient) -> None:
        """Revocar dispositivo → 204 No Content."""
        user = make_user()
        device_id = uuid4()
        mock_service = AsyncMock(spec=DeviceTokenService)
        mock_service.revoke_device.return_value = None
        override_current_user(user)

        from app.core.dependencies import get_device_token_service
        from app.main import app

        app.dependency_overrides[get_device_token_service] = lambda: mock_service

        try:
            response = await client.delete(f"/api/v1/devices/{device_id}")

            assert response.status_code == 204
            mock_service.revoke_device.assert_awaited_once_with(
                device_id=device_id,
                user_id=user.id,
            )
        finally:
            clear_overrides()
