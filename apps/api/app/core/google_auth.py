"""Verificación de ID tokens emitidos por Google Sign-In.

Este módulo aísla toda la dependencia con `google-auth` en un único punto.
- El resto del código (servicios, routers) nunca importa `google.oauth2` directamente.
- Es trivial de mockear en tests monkeypatchando `verify_google_id_token`.
- Migrar a otro proveedor (Auth0, Cognito) en el futuro solo toca este archivo.
"""

from __future__ import annotations

from typing import Any

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from app.core.config import settings

# Emisores válidos para tokens de Google. Google documenta ambos formatos
# (con y sin esquema) por compatibilidad hacia atrás.
# https://developers.google.com/identity/sign-in/web/backend-auth
_VALID_ISSUERS = frozenset({"accounts.google.com", "https://accounts.google.com"})

# Tolerancia de 10s para drift de reloj entre Google y nuestro servidor.
# Evita falsos negativos cuando hay desincronización leve de NTP.
_CLOCK_SKEW_SECONDS = 10


class GoogleAuthError(Exception):
    """Falla al verificar el id_token de Google.

    El mensaje está pensado para que el router lo traduzca a un
    HTTPException con código y mensaje en español para el cliente.
    El campo `reason` se usa para distinguir el código HTTP adecuado.
    """

    def __init__(self, reason: str, message: str) -> None:
        super().__init__(message)
        self.reason = reason
        self.message = message


def verify_google_id_token(token: str) -> dict[str, Any]:
    """Verifica un id_token de Google y devuelve los claims decodificados.

    Realiza tres validaciones que `google.oauth2.id_token.verify_oauth2_token`
    NO hace por sí solo:
      1. Que `google_client_id` esté configurado (modo degradado → 503).
      2. Que `iss` sea un emisor oficial de Google.
      3. Que `email_verified` sea True.

    La validación de `aud` (audience == google_client_id) y `exp` ya las
    realiza internamente `verify_oauth2_token` cuando se pasa `audience`.

    Args:
        token: el id_token JWT enviado por el frontend tras Google Sign-In.

    Returns:
        Los claims del token como dict. Garantiza las claves `sub`, `email`
        y `email_verified` tras las validaciones.

    Raises:
        GoogleAuthError: si el token es inválido, expirado, no pertenece
            a nuestra app, no es de Google, o el email no está verificado.
    """
    if not settings.google_client_id:
        raise GoogleAuthError(
            reason="not_configured",
            message="Login con Google no está disponible en este momento",
        )

    try:
        # verify_oauth2_token valida firma, exp, iat y aud en un solo paso.
        # Devuelve un Mapping[str, Any] con los claims estándar de OIDC.
        # Los type: ignore son porque google-auth no publica stubs de tipo
        # completos para estas funciones — el contrato real está documentado.
        claims: dict[str, Any] = google_id_token.verify_oauth2_token(  # type: ignore[no-untyped-call]
            token,
            google_requests.Request(),  # type: ignore[no-untyped-call]
            audience=settings.google_client_id,
            clock_skew_in_seconds=_CLOCK_SKEW_SECONDS,
        )
    except ValueError as e:
        # google-auth lanza ValueError para token malformado, firma inválida,
        # aud incorrecto, o token expirado. Unificamos como "token inválido".
        raise GoogleAuthError(
            reason="invalid_token",
            message="Token de Google inválido o expirado",
        ) from e

    # Validación de issuer — verify_oauth2_token no la hace.
    issuer = claims.get("iss")
    if issuer not in _VALID_ISSUERS:
        raise GoogleAuthError(
            reason="invalid_issuer",
            message="Token de Google inválido o expirado",
        )

    # SEGURIDAD: nunca confiar en un email que Google no ha verificado.
    # Un atacante podría usar el endpoint con un token auto-firmado si
    # relajamos esta validación.
    if not claims.get("email_verified", False):
        raise GoogleAuthError(
            reason="email_not_verified",
            message="El email de la cuenta Google no está verificado",
        )

    email = claims.get("email")
    sub = claims.get("sub")
    if not email or not sub:
        # Token estructuralmente válido pero sin los claims que necesitamos.
        raise GoogleAuthError(
            reason="missing_claims",
            message="Token de Google inválido o expirado",
        )

    return claims
