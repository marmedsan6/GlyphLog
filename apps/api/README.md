# 🚀 GlyphLog API

Backend de GlyphLog. Una API REST robusta construida con FastAPI (Python) para gestionar la colección personal de anime, manga y videojuegos de los usuarios.

---

## 🛠️ Stack Tecnológico

| Tecnología | Versión | Rol |
|------------|---------|-----|
| **Python** | `3.11+` (Compatible con `3.14`) | Lenguaje principal |
| **FastAPI** | `0.110+` | Framework API asíncrono y de alto rendimiento |
| **Pydantic v2** | `2+` | Validación estricta y serialización de datos (schemas) |
| **SQLAlchemy** | `2+` | ORM asíncrono para mapeo y queries de base de datos |
| **Alembic** | `latest` | Gestión y migración de esquemas de BD |
| **PostgreSQL** | `15+` | Base de datos relacional para producción y desarrollo |
| **slowapi** | `0.1.10` | Limitación de tasa (rate limiting) para seguridad en auth |

---

## 📖 Documentación de la API (Swagger / OpenAPI)

FastAPI genera automáticamente documentación interactiva enriquecida y el esquema formal OpenAPI.

### Acceso a la documentación en desarrollo

Cuando la API está corriendo localmente o mediante Docker (por defecto en el puerto `8000`), puedes acceder a:

*   **Swagger UI (Recomendado):** [http://localhost:8000/docs](http://localhost:8000/docs)  
    *Permite visualizar e interactuar directamente con todos los endpoints (probar peticiones, ver schemas, validar respuestas).*
*   **ReDoc UI:** [http://localhost:8000/redoc](http://localhost:8000/redoc)  
    *Documentación limpia y organizada en tres paneles, ideal para lectura profunda.*
*   **Esquema OpenAPI (JSON):** [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)  
    *Esquema formal OpenAPI 3.0 que puede ser importado en Postman, Insomnia o utilizado para codegen de clientes.*

---

## 📁 Estructura del Proyecto

```
apps/api/
├── alembic/             # Versiones e histórico de migraciones SQL
├── app/
│   ├── core/            # Configuración global, seguridad, uploads y rate limiting
│   ├── models/          # Modelos declarativos SQLAlchemy (fuente de verdad de la BD)
│   ├── schemas/         # Schemas Pydantic para validación de entrada/salida (In/Out)
│   ├── repositories/    # Capa de persistencia (Consultas directas SQL/ORM)
│   ├── services/        # Capa de lógica de negocio (casos de uso)
│   ├── routers/         # Endpoints de la API (exposición HTTP y middleware)
│   └── main.py          # Punto de entrada y montaje de middlewares/rutas
├── tests/               # Suite completa de tests unitarios y de integración (pytest)
├── requirements.txt     # Dependencias del entorno de producción
├── requirements-dev.txt # Dependencias de testing, formato y desarrollo
├── alembic.ini          # Configuración básica de Alembic
└── Dockerfile           # Receta de empaquetado Docker optimizado
```

---

## ⚙️ Configuración y Ejecución

### Requisito previo: Base de Datos

La API requiere una instancia de PostgreSQL. Puedes levantarla fácilmente usando Docker Compose en la raíz del proyecto:

```bash
docker compose up -d postgres
```

### Ejecución con Docker (Recomendado)

Para levantar la API junto con todo el ecosistema (BD + Frontend) en contenedores Docker:

```bash
docker compose up -d
```

La API estará disponible en `http://localhost:8000`.

### Ejecución Nativa (Desarrollo)

1.  **Crear y activar un entorno virtual de Python:**
    ```bash
    python3 -m venv .venv
    source .venv/bin/activate  # En Windows: .venv\Scripts\activate
    ```

2.  **Instalar dependencias:**
    ```bash
    pip install -r requirements.txt -r requirements-dev.txt
    ```

3.  **Configurar variables de entorno:**
    Copia el archivo `.env.example` a `.env` y rellena las variables de configuración:
    ```bash
    cp .env.example .env
    ```

4.  **Aplicar migraciones de Alembic:**
    ```bash
    alembic upgrade head
    ```

5.  **Iniciar el servidor de desarrollo (con autoreload):**
    ```bash
    pnpm dev
    # O directamente con uvicorn:
    # uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    ```

---

## 🧪 Testing y Calidad

Para ejecutar la suite de pruebas unitarias y de integración de la API (no requiere PostgreSQL local activo ya que mockea los componentes):

```bash
pytest
```

Para verificar el cumplimiento del formato y estándares del proyecto mediante Ruff:

```bash
ruff check app/
```
