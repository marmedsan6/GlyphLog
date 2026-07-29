from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import func

from app.models.device_token import DeviceToken


class DeviceTokenRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self,
        user_id: UUID,
        token_hash: str,
        pairing_code: str,
        pairing_expires_at: datetime,
        expires_at: datetime,
    ) -> DeviceToken:
        """Crea un device token en estado pendiente (con código de emparejamiento)."""
        device = DeviceToken(
            user_id=user_id,
            device_name="Pendiente de activación",
            token_hash=token_hash,
            pairing_code=pairing_code,
            pairing_expires_at=pairing_expires_at,
            expires_at=expires_at,
            is_revoked=False,
        )
        self.db.add(device)
        await self.db.flush()
        await self.db.refresh(device)
        return device

    async def find_by_pairing_code(self, code: str) -> DeviceToken | None:
        """Busca un device token por código de emparejamiento activo (no expirado)."""
        stmt = (
            select(DeviceToken)
            .where(
                DeviceToken.pairing_code == code,
                DeviceToken.is_revoked.is_(False),
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def find_by_token_hash(self, token_hash: str) -> DeviceToken | None:
        """Busca un device token activo por hash del token."""
        stmt = (
            select(DeviceToken)
            .where(
                DeviceToken.token_hash == token_hash,
                DeviceToken.is_revoked.is_(False),
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def find_active_by_user(self, user_id: UUID) -> list[DeviceToken]:
        """Lista todos los device tokens activos (no revocados) de un usuario."""
        stmt = (
            select(DeviceToken)
            .where(
                DeviceToken.user_id == user_id,
                DeviceToken.is_revoked.is_(False),
            )
            .order_by(DeviceToken.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_active_by_user(self, user_id: UUID) -> int:
        """Cuenta los device tokens activos (no revocados, activados) de un usuario."""
        stmt = (
            select(func.count())
            .select_from(DeviceToken)
            .where(
                DeviceToken.user_id == user_id,
                DeviceToken.is_revoked.is_(False),
                # Solo contar tokens ya activados (sin código pendiente)
                DeviceToken.pairing_code.is_(None),
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def activate(
        self,
        device: DeviceToken,
        device_name: str,
        token_hash: str,
        expires_at: datetime,
    ) -> DeviceToken:
        """Activa un device token: asigna nombre, hash definitivo y limpia el código."""
        device.device_name = device_name
        device.token_hash = token_hash
        device.pairing_code = None
        device.pairing_expires_at = None
        device.expires_at = expires_at
        await self.db.flush()
        await self.db.refresh(device)
        return device

    async def revoke(self, device_id: UUID, user_id: UUID) -> bool:
        """Revoca un device token. Devuelve True si se encontró y revocó."""
        stmt = (
            update(DeviceToken)
            .where(
                DeviceToken.id == device_id,
                DeviceToken.user_id == user_id,
                DeviceToken.is_revoked.is_(False),
            )
            .values(is_revoked=True)
        )
        result = await self.db.execute(stmt)
        await self.db.flush()
        return result.rowcount > 0

    async def update_last_used(self, device_id: UUID, new_expires_at: datetime) -> None:
        """Actualiza last_used_at y renueva la expiración del token."""
        stmt = (
            update(DeviceToken)
            .where(DeviceToken.id == device_id)
            .values(
                last_used_at=datetime.now(timezone.utc),
                expires_at=new_expires_at,
            )
        )
        await self.db.execute(stmt)
        # No hacemos flush aquí — se ejecuta tras la respuesta para no bloquear.

    async def cleanup_expired_pairing_codes(self) -> int:
        """Revoca códigos de emparejamiento expirados que nunca fueron activados."""
        now = datetime.now(timezone.utc)
        stmt = (
            update(DeviceToken)
            .where(
                DeviceToken.pairing_code.is_not(None),
                DeviceToken.pairing_expires_at < now,
                DeviceToken.is_revoked.is_(False),
            )
            .values(is_revoked=True)
        )
        result = await self.db.execute(stmt)
        await self.db.flush()
        return result.rowcount
