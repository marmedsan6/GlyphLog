from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.services.device_token_service import DEVICE_TOKEN_PREFIX, DEVICE_TOKEN_TTL

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# bcrypt tiene un límite de 72 bytes. Contraseñas más largas se truncan
# antes del hashing para evitar ValueError en bcrypt >= 4.1.
_BCRYPT_MAX_BYTES = 72


def hash_password(password: str) -> str:
    """
    Genera el hash bcrypt de una contraseña en texto plano.

    bcrypt trunca contraseñas a 72 bytes. Se trunca explícitamente
    para evitar ValueError en bcrypt >= 4.1 y documentar el comportamiento.
    """
    password_bytes = password.encode("utf-8")[:_BCRYPT_MAX_BYTES]
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica una contraseña contra su hash bcrypt.
    Operación constant-time: resistente a timing attacks.
    Trunca a 72 bytes para coincidir con hash_password().
    """
    password_bytes = plain_password.encode("utf-8")[:_BCRYPT_MAX_BYTES]
    return bcrypt.checkpw(password_bytes, hashed_password.encode("utf-8"))


def create_access_token(subject: str | UUID) -> str:
    """
    Genera un JWT firmado con el subject (user_id) y tiempo de expiración.
    Usa PyJWT en lugar de python-jose (CVE-2024-33663).
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decodifica y valida un JWT.
    Lanza HTTPException 401 si el token es inválido o ha expirado.
    """
    try:
        return jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dependencia de FastAPI para rutas protegidas.
    Extrae el JWT del header Authorization, lo valida y devuelve el usuario.
    """
    # Import diferido para evitar importaciones circulares
    from app.repositories.user_repository import UserRepository

    payload = decode_access_token(token)
    user_id: str | None = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido: falta el subject",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido: subject no es un UUID válido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    repo = UserRepository(db)
    user = await repo.get_by_id(user_uuid)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


class AuthenticatedUser:
    """Wrapper que incluye el usuario y la fuente de autenticación.

    Permite que los endpoints distingan si la petición viene de la SPA (JWT)
    o de un dispositivo externo (device token) para registrar el source correcto
    en los eventos de progreso.
    """

    def __init__(self, user: User, source: str = "web") -> None:
        self.user = user
        self.source = source

    @property
    def id(self) -> UUID:
        return self.user.id


async def get_current_user_flexible(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> AuthenticatedUser:
    """Dependencia que acepta tanto JWT como device tokens.

    Los device tokens se identifican por el prefijo 'dt_'.
    - JWT: delega en get_current_user, source="web".
    - Device token: valida hash contra BD, verifica expiración y revocación,
      actualiza last_used_at y renueva la expiración (rolling 90 días).
    """
    if not token.startswith(DEVICE_TOKEN_PREFIX):
        # Es un JWT normal
        user = await get_current_user(token=token, db=db)
        return AuthenticatedUser(user=user, source="web")

    # Es un device token — validar contra BD
    import hashlib

    from app.repositories.device_token_repository import DeviceTokenRepository
    from app.repositories.user_repository import UserRepository

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    device_repo = DeviceTokenRepository(db)
    device = await device_repo.find_by_token_hash(token_hash)

    if device is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Device token inválido o revocado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verificar expiración
    now = datetime.now(timezone.utc)
    if device.expires_at < now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Device token expirado. Vuelve a emparejar el dispositivo desde GlyphLog.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verificar que el código de emparejamiento fue activado (no pendiente)
    if device.pairing_code is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Este dispositivo no ha sido activado.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Obtener el usuario
    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(device.user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Renovar expiración y actualizar last_used_at (rolling expiration)
    new_expires_at = now + DEVICE_TOKEN_TTL
    await device_repo.update_last_used(device.id, new_expires_at)

    return AuthenticatedUser(user=user, source="browser_extension")

