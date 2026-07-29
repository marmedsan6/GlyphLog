import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException, status

from app.repositories.device_token_repository import DeviceTokenRepository
from app.schemas.device_token import (
    ActivateDeviceResponse,
    DeviceListResponse,
    DeviceResponse,
    PairingCodeResponse,
)

# Tiempo de vida de un código de emparejamiento (5 minutos).
_PAIRING_CODE_TTL = timedelta(minutes=5)

# Tiempo de vida de un device token activado (90 días).
# Se renueva automáticamente con cada uso (rolling expiration).
DEVICE_TOKEN_TTL = timedelta(days=90)

# Máximo de device tokens activos por usuario.
_MAX_ACTIVE_DEVICES = 5

# Prefijo para identificar device tokens en el header Authorization.
# Permite distinguirlos de los JWT sin necesidad de decodificar.
DEVICE_TOKEN_PREFIX = "dt_"


def _hash_token(token: str) -> str:
    """Genera el SHA-256 de un token. Determinístico y sin salt (para búsqueda por hash)."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _generate_pairing_code() -> str:
    """Genera un código de emparejamiento de 6 caracteres alfanuméricos uppercase."""
    # secrets.token_hex(3) genera 6 caracteres hex; convertimos a uppercase
    return secrets.token_hex(3).upper()


def _generate_device_token() -> str:
    """Genera un device token seguro con prefijo dt_."""
    # 32 bytes = 64 caracteres hex = suficiente entropía (256 bits)
    return f"{DEVICE_TOKEN_PREFIX}{secrets.token_hex(32)}"


class DeviceTokenService:
    def __init__(self, device_token_repo: DeviceTokenRepository) -> None:
        self.repo = device_token_repo
        self.db = device_token_repo.db

    async def generate_pairing_code(self, user_id: UUID) -> PairingCodeResponse:
        """Genera un código de emparejamiento para vincular un dispositivo.

        Valida el límite de dispositivos activos antes de generar.
        El código expira en 5 minutos y es de un solo uso.
        """
        active_count = await self.repo.count_active_by_user(user_id)
        if active_count >= _MAX_ACTIVE_DEVICES:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Has alcanzado el límite de {_MAX_ACTIVE_DEVICES} dispositivos activos. "
                    "Revoca un dispositivo existente antes de emparejar uno nuevo."
                ),
            )

        # Limpiar códigos expirados del usuario antes de generar uno nuevo
        await self.repo.cleanup_expired_pairing_codes()

        now = datetime.now(timezone.utc)
        pairing_code = _generate_pairing_code()
        # Generamos un token temporal que se reemplazará al activar.
        # Esto permite que el hash sea único en BD mientras el código está pendiente.
        temp_token = _generate_device_token()
        temp_hash = _hash_token(temp_token)

        await self.repo.create(
            user_id=user_id,
            token_hash=temp_hash,
            pairing_code=pairing_code,
            pairing_expires_at=now + _PAIRING_CODE_TTL,
            expires_at=now + DEVICE_TOKEN_TTL,
        )
        await self.db.commit()

        return PairingCodeResponse(
            pairing_code=pairing_code,
            expires_in=int(_PAIRING_CODE_TTL.total_seconds()),
        )

    async def activate_device(
        self,
        pairing_code: str,
        device_name: str,
    ) -> ActivateDeviceResponse:
        """Activa un dispositivo usando un código de emparejamiento.

        Valida que el código exista, no haya expirado y no esté ya activado.
        Devuelve el device_token en texto plano (ÚNICA VEZ que se muestra).
        """
        device = await self.repo.find_by_pairing_code(pairing_code.upper())

        if device is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Código de emparejamiento no encontrado o ya utilizado.",
            )

        now = datetime.now(timezone.utc)
        if device.pairing_expires_at and device.pairing_expires_at < now:
            # Marcar como revocado para limpiar
            await self.repo.revoke(device.id, device.user_id)
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="El código de emparejamiento ha expirado. Genera uno nuevo desde GlyphLog.",
            )

        # Generar el token definitivo
        real_token = _generate_device_token()
        real_hash = _hash_token(real_token)

        activated = await self.repo.activate(
            device=device,
            device_name=device_name.strip(),
            token_hash=real_hash,
            expires_at=now + DEVICE_TOKEN_TTL,
        )
        await self.db.commit()

        return ActivateDeviceResponse(
            device_token=real_token,
            device_id=activated.id,
            device_name=activated.device_name,
        )

    async def list_devices(self, user_id: UUID) -> DeviceListResponse:
        """Lista todos los dispositivos activos del usuario (excluyendo pendientes de activar)."""
        devices = await self.repo.find_active_by_user(user_id)
        # Filtrar los que están pendientes de activación (todavía tienen código)
        activated_devices = [d for d in devices if d.pairing_code is None]

        return DeviceListResponse(
            devices=[DeviceResponse.model_validate(d) for d in activated_devices],
        )

    async def revoke_device(self, device_id: UUID, user_id: UUID) -> None:
        """Revoca un dispositivo del usuario."""
        success = await self.repo.revoke(device_id, user_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dispositivo no encontrado o ya revocado.",
            )
        await self.db.commit()
