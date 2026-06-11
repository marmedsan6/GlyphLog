from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Base de datos ──────────────────────────────────────────────────────────
    database_url: str

    # ── JWT ────────────────────────────────────────────────────────────────────
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # ── App ────────────────────────────────────────────────────────────────────
    debug: bool = False
    allowed_origins: list[str] = ["http://localhost:5173"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )

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
