from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Base de datos ──────────────────────────────────────────────────────────
    # Valores por defecto vacíos para tipado estricto con mypy; los validadores
    # garantizan que el entorno provea valores reales antes de que la app arranque.
    database_url: str = Field(default="")

    # ── JWT ────────────────────────────────────────────────────────────────────
    secret_key: str = Field(default="")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # ── Rate limiting ────────────────────────────────────────────────────────
    # Formato: "N/period" (ej: "5/minute", "10/hour"). Slowapi parsea estos strings.
    rate_limit_login: str = "5/minute"
    rate_limit_register: str = "3/minute"

    # ── App ────────────────────────────────────────────────────────────────────
    debug: bool = False
    allowed_origins: list[str] = ["http://localhost:5173"]

    # ── Google OAuth ───────────────────────────────────────────────────────────
    # Client ID de Google para validar id_tokens emitidos por Google Sign-In.
    # Si está vacío, el endpoint POST /api/v1/auth/google responde con 503
    # (modo degradado). Esto permite desarrollar y testear el resto de la
    # app sin necesidad de configurar Google Cloud Console.
    google_client_id: str = ""

    # ── RAWG API ───────────────────────────────────────────────────────────────
    # API Key para realizar búsquedas externas en el catálogo de videojuegos.
    # Si está vacía, se omitirá la búsqueda en RAWG degradándose graciosamente.
    rawg_api_key: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )

    @field_validator("database_url")
    @classmethod
    def database_url_must_be_set(cls, v: str) -> str:
        # La app no arranca si DATABASE_URL no está configurada.
        if not v:
            raise ValueError("DATABASE_URL no está configurada")
        return v

    @field_validator("secret_key")
    @classmethod
    def secret_key_must_be_strong(cls, v: str) -> str:
        # La app no arranca si SECRET_KEY es débil.
        # Previene despliegues accidentales con claves de ejemplo.
        if len(v) < 32:
            raise ValueError(
                "SECRET_KEY debe tener al menos 32 caracteres. "
                'Genera uno con: python -c "import secrets; print(secrets.token_hex(32))"'
            )
        return v

    # allowed_origins acepta formato JSON en el .env:
    # ALLOWED_ORIGINS=["http://localhost:5173","https://app.example.com"]
    # pydantic-settings 2.x parsea automáticamente listas como JSON.


# Instancia singleton — importar desde aquí en todo el proyecto
settings = Settings()
