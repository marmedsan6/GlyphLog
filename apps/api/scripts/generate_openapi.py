"""Genera el esquema OpenAPI de FastAPI como JSON para el frontend.

Uso:
    ../api/.venv/bin/python ../api/scripts/generate_openapi.py

El JSON se escribe en apps/web/openapi.json para que openapi-typescript
pueda generar los tipos TypeScript de la API.
"""

import json
import os
import sys
from pathlib import Path

# Añadir apps/api al PYTHONPATH para poder importar app.main
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# La generación del esquema OpenAPI no requiere valores reales de BD ni secretos,
# pero importar app.main inicializa Settings. Usamos valores dummy para evitar
# depender de un archivo .env cargado durante la generación de tipos.
os.environ.setdefault(
    "DATABASE_URL", "postgresql+asyncpg://dummy:dummy@localhost:5432/dummy"
)
os.environ.setdefault("SECRET_KEY", "dummy-secret-key-not-used-in-production")

from app.main import app


def main() -> None:
    openapi_schema = app.openapi()
    output_path = Path(__file__).resolve().parents[1] / ".." / "web" / "openapi.json"
    output_path.write_text(json.dumps(openapi_schema, indent=2), encoding="utf-8")
    print(f"OpenAPI schema written to {output_path}")


if __name__ == "__main__":
    main()
