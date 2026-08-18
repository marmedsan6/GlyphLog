import asyncio

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError

from app.core.google_auth import GoogleAuthError, verify_google_id_token
from app.core.security import create_access_token, hash_password, verify_password
from app.core.validators import normalize_email
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, RegisterResponse, TokenResponse
from app.schemas.user import UserCreate, UserResponse

# Hash bcrypt dummy para prevenir timing attacks en login.
# Se genera con el mismo coste ($2b$12$) que los hashes reales.
_DUMMY_HASH = "$2b$12$SzVRk9lPDV/CyWEnZKKnGegpfWmxCj4bZh2YBjYwBwU156B9t7.I2"

# Proveedor OAuth soportado. Centralizado para que añadir GitHub u otro sea
# cambiar este literal (o convertirlo en Enum si se incrementa la lista).
_GOOGLE_PROVIDER = "google"


def _normalize_email(email: str) -> str:
    # Mismo normalizado que UserCreate.validate_and_normalize_email: lower-case
    # y validación de formato. Reutilizado para emails que vienen de Google
    # porque aunque Google ya devuelve un email en minúsculas, defendemos
    # contra futuras regresiones del proveedor.
    try:
        return normalize_email(email)
    except ValueError:
        # El token de Google ya pasó por verify_google_id_token, así que
        # un email inválido aquí sería una inconsistencia muy rara. Fallamos
        # genérico para no filtrar información.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de Google inválido o expirado",
        )


class AuthService:
    def __init__(self, user_repo: UserRepository) -> None:
        self.user_repo = user_repo

    async def register(self, data: UserCreate) -> RegisterResponse:
        existing = await self.user_repo.get_by_email(data.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe una cuenta con este email",
            )

        hashed_password = await asyncio.to_thread(hash_password, data.password)
        try:
            user = await self.user_repo.create(data, hashed_password)
        except IntegrityError as e:
            # Verificar que el error es por email duplicado (constraint unique de users.email)
            # y no por otra violación de integridad.
            if "users_email_key" in str(e.orig):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Ya existe una cuenta con este email",
                )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Error de integridad en los datos",
            )

        access_token = create_access_token(user.id)

        return RegisterResponse(
            user=UserResponse.model_validate(user),
            access_token=access_token,
            token_type="bearer",
        )

    async def login(self, data: LoginRequest) -> TokenResponse:
        # SEGURIDAD: devolver el mismo error si el email no existe
        # o si la contraseña es incorrecta. Previene enumeración de emails.
        unauthorized = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
        )

        user = await self.user_repo.get_by_email(data.email)

        # SEGURIDAD: una cuenta OAuth (provider != "local") no tiene password.
        # Tratamos el intento de login con password como credenciales incorrectas
        # — el mismo error genérico que email/contraseña inválidos, para no
        # filtrar al cliente si la cuenta es OAuth o local.
        if user is None or user.hashed_password is None:
            # SEGURIDAD: ejecutar verify_password siempre para prevenir timing
            # attacks. Si el usuario no existe o es OAuth (sin password),
            # verificamos contra un hash dummy con coste equivalente.
            await asyncio.to_thread(verify_password, data.password, _DUMMY_HASH)
            raise unauthorized

        password_valid = await asyncio.to_thread(
            verify_password, data.password, user.hashed_password
        )
        if not password_valid:
            raise unauthorized

        access_token = create_access_token(user.id)
        return TokenResponse(access_token=access_token, token_type="bearer")

    async def login_or_register_with_google(self, id_token: str) -> RegisterResponse:
        # Verifica el id_token contra Google. verify_google_id_token lanza
        # GoogleAuthError si algo falla: configuración ausente, firma, aud,
        # iss, email_verified o claims faltantes.
        try:
            claims = verify_google_id_token(id_token)
        except GoogleAuthError as e:
            status_code, detail = _google_error_to_http(e.reason, e.message)
            raise HTTPException(status_code=status_code, detail=detail) from e

        email = _normalize_email(claims["email"])
        provider_id = claims["sub"]

        # Búsqueda primaria por (provider, provider_id) — más rápida gracias
        # al índice parcial y semánticamente correcta: si un usuario está
        # vinculado a Google, este lookup lo encuentra directamente sin
        # pasar por el email.
        user = await self.user_repo.get_by_provider_and_id(_GOOGLE_PROVIDER, provider_id)

        if user is None:
            # No hay usuario con este provider_id. ¿Existe el email?
            user = await self.user_repo.get_by_email(email)

            if user is None:
                # Email nuevo → crear cuenta OAuth desde cero.
                try:
                    user = await self.user_repo.create_oauth_user(
                        email=email,
                        provider=_GOOGLE_PROVIDER,
                        provider_id=provider_id,
                    )
                except IntegrityError as e:
                    # Race condition: otro request creó el usuario con el
                    # mismo email entre el SELECT y el INSERT. Lo recargamos
                    # y reintentamos la lógica de "existe".
                    if "users_email_key" in str(e.orig):
                        user = await self.user_repo.get_by_email(email)
                        if user is None:
                            # Inconsistencia muy rara — el INSERT falló pero
                            # el SELECT post-rollback no encuentra la fila.
                            raise HTTPException(
                                status_code=status.HTTP_409_CONFLICT,
                                detail="Error al crear la cuenta con Google. Inténtalo de nuevo.",
                            )
                    else:
                        raise HTTPException(
                            status_code=status.HTTP_409_CONFLICT,
                            detail="Error de integridad al crear la cuenta",
                        )
            elif user.provider == "local":
                # SEGURIDAD: NO vincular automáticamente una cuenta local
                # existente con Google. Requeriría un flujo de confirmación
                # explícito (enviar email, validar propiedad). Sin esa
                # salvaguarda, un atacante que controle la cuenta de Google
                # con ese email secuestraría la cuenta local.
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "Ya existe una cuenta con este email. "
                        "Inicia sesión con tu contraseña y vincula Google desde tu perfil."
                    ),
                )
            else:
                # Mismo email pero provider != "google" y provider_id != sub:
                # la cuenta Google se reconfiguró o fue comprometida.
                # 409 Conflict (no 401) porque el problema es de estado
                # del recurso (email ya vinculado a otra cuenta Google),
                # no de credenciales inválidas. Ver issue #16.
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Email ya vinculado a otra cuenta de Google",
                )

        # Si llegamos aquí con `user.provider != "google"`, el SELECT inicial
        # por (provider, provider_id) falló pero la rama de email-existing
        # también. Esto solo ocurre si hay un bug; lo tratamos como 409
        # por consistencia con el caso anterior.
        if user.provider != _GOOGLE_PROVIDER or user.provider_id != provider_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email ya vinculado a otra cuenta de Google",
            )

        access_token = create_access_token(user.id)
        return RegisterResponse(
            user=UserResponse.model_validate(user),
            access_token=access_token,
            token_type="bearer",
        )


def _google_error_to_http(reason: str, message: str) -> tuple[int, str]:
    """Traduce la `reason` interna de GoogleAuthError a (status, detail)."""
    if reason == "not_configured":
        # 503 = servicio temporalmente no disponible. Indica al cliente
        # que reintente más tarde o use email/password como alternativa.
        return status.HTTP_503_SERVICE_UNAVAILABLE, message
    # invalid_token, invalid_issuer, email_not_verified, missing_claims
    # se exponen todos como 401 con mensaje genérico para no filtrar
    # al cliente detalles internos de la validación.
    return status.HTTP_401_UNAUTHORIZED, message
