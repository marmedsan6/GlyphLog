# Arquitectura del Backend

## Stack

| Tecnología | Versión | Rol |
|---|---|---|
| Python | 3.11+ | Lenguaje principal |
| FastAPI | 0.111+ | Framework web asíncrono, routing, OpenAPI automático |
| Pydantic | 2.x | Validación y serialización de datos (schemas) |
| SQLAlchemy | 2.x | ORM, definición de modelos y queries |
| Alembic | 1.x | Migraciones de base de datos |
| PyJWT | 2.x | Generación y verificación de JWT |
| bcrypt | 4.1+ | Hashing de contraseñas |
| google-auth | — | Verificación de `id_token` de Google OAuth |
| httpx | — | Cliente HTTP asíncrono para APIs externas (AniList, RAWG) |
| boto3 | — | Cliente AWS Bedrock (Claude) para features de IA |
| openai | — | Proveedor LLM local/desarrollo (ADR-014) |
| uvicorn | — | Servidor ASGI para desarrollo y producción |

---

## Estructura de carpetas

```
apps/api/app/
├── routers/           # Endpoints agrupados por recurso
├── services/          # Lógica de negocio (sin acceso directo a BD)
├── repositories/      # Queries SQLAlchemy, única capa que toca la BD
├── schemas/           # Pydantic models para request y response
├── models/            # SQLAlchemy models (definición de tablas)
├── integrations/      # Clientes a servicios externos (AniList, RAWG, Bedrock, YouTube, LLM)
├── core/
│   ├── config.py      # Settings desde variables de entorno (pydantic-settings)
│   ├── security.py    # JWT, hashing, dependencias de autenticación
│   ├── database.py    # Session factory y dependencia get_db
│   ├── dependencies.py# Inyección de dependencias + get_llm_client()
│   ├── google_auth.py # Integración y validación de tokens de Google OAuth
│   ├── rate_limiter.py# Configuración de SlowAPI para rate limiting
│   ├── uploads.py     # Manejo de subida y validación de imágenes
│   └── validators.py  # Validadores reutilizables (normalización de emails)
└── main.py            # Entry point, instancia FastAPI, registro de routers y middlewares
```

---

## Patrón de capas

El flujo de dependencias sigue una dirección única y estricta:

```mermaid
graph LR
    R["Router\nvalida request\ndevuelve response"]
    S["Service\nlógica de negocio\nreglas y validaciones"]
    Repo["Repository\nqueries SQLAlchemy\nacceso a BD"]
    DB[("PostgreSQL")]

    R -->|delega| S
    S -->|delega| Repo
    Repo -->|ORM| DB
```

- **Router**: valida la request con Pydantic, llama al servicio, devuelve la response. Sin lógica de negocio.
- **Service**: aplica reglas de negocio (p. ej. un usuario solo puede ver sus propias entradas). No ejecuta queries directamente.
- **Repository**: única capa con acceso a la base de datos.
- **Los routers nunca acceden a la BD directamente.**

---

## Autenticación

- **Mecanismo principal**: JWT Bearer tokens (OAuth2PasswordBearer).
- **Librería**: `PyJWT` para firmar/verificar, `bcrypt` para hashear contraseñas.
- **Login social**: Google OAuth verificado con `google-auth` (ADR-006).
- **Autenticación flexible para dispositivos**: `get_current_user_flexible` acepta JWT o device token (prefijo `dt_`) para la extensión Chrome (ADR-011). Los device tokens se limitan a lectura/creación/progreso por endpoint.

---

## Endpoints de la API

Todos bajo el prefijo `/api/v1` salvo el health check. Documentación interactiva en `/docs` (cuando `DEBUG=true`).

| Método | Ruta | Recurso | Auth |
|---|---|---|---|
| `POST` | `/auth/register` | Registro local | No |
| `POST` | `/auth/login` | Login local (JWT) | No |
| `POST` | `/auth/google` | Login/registro Google OAuth | No |
| `GET` | `/entries` | Listar entradas (filtros, búsqueda, orden, paginación) | JWT / device token |
| `POST` | `/entries` | Crear entrada (multipart) | JWT / device token |
| `GET` | `/entries/{id}` | Detalle de entrada | JWT / device token |
| `PUT` | `/entries/{id}` | Actualizar metadatos | JWT |
| `POST` | `/entries/{id}/cover` | Subir/actualizar portada | JWT |
| `DELETE` | `/entries/{id}` | Eliminar entrada | JWT |
| `POST` | `/entries/{id}/progress` | Actualizar progreso | JWT / device token |
| `POST` | `/entries/{id}/progress/reset` | Reiniciar progreso | JWT |
| `GET` | `/entries/{id}/progress/history` | Historial de progreso | JWT |
| `GET` | `/external/search` | Búsqueda en catálogos externos (AniList/RAWG) | JWT |
| `GET` | `/external/games/{slug}` | Detalle de juego (RAWG) | JWT |
| `GET` | `/users/me` | Perfil del usuario | JWT |
| `PATCH` | `/users/me` | Actualizar perfil | JWT |
| `POST` | `/users/me/avatar` | Subir avatar | JWT |
| `DELETE` | `/users/me/avatar` | Eliminar avatar | JWT |
| `POST` | `/devices/pair` | Generar código de emparejamiento | JWT |
| `POST` | `/devices/activate` | Activar device token | No |
| `DELETE` | `/devices/{id}` | Revocar device token | JWT |
| `POST` | `/import/parse` | Parsear listas externas (MAL/AniList/texto) | JWT |
| `POST` | `/import/execute` | Ejecutar importación | JWT |
| `POST` | `/recommendations/generate` | Recomendaciones con LLM | JWT |
| `POST` | `/ai/chat` | Chat GlyphAI (SSE) | JWT |
| `GET` | `/ai/conversations` | Listar conversaciones | JWT |
| `POST` | `/ai/analyze` | Análisis de colección | JWT |
| `DELETE` | `/ai/conversations/{id}` | Eliminar conversación | JWT |
| `POST` | `/youtube/...` | Descubrimiento de YouTube | JWT |
| `GET` | `/stats/overview` | Estadísticas de la colección | JWT |
| `GET` | `/health` | Health check | No |

---

## Variables de entorno requeridas

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DATABASE_URL` | DSN de conexión a PostgreSQL | `postgresql+asyncpg://user:pass@localhost:5432/glyphlog` |
| `SECRET_KEY` | Clave para firmar JWT (mínimo 32 caracteres) | `supersecretkey...` |
| `ALGORITHM` | Algoritmo de firma JWT | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Expiración del token en minutos | `60` |
| `DEBUG` | Activa modo depuración y Swagger | `True` / `False` |
| `ALLOWED_ORIGINS` | Orígenes CORS permitidos (JSON en `.env`) | `["http://localhost:5173"]` |
| `GOOGLE_CLIENT_ID` | Client ID de Google OAuth | `123456-abcdef.apps.googleusercontent.com` |
| `RAWG_API_KEY` | API key de RAWG (opcional) | `...` |
| `AI_COMPLETION_PROVIDER` | Proveedor LLM: `openai` (local) o `bedrock` (prod) | `openai` / `bedrock` |
| `OPENAI_API_KEY` | API key de OpenAI (cuando `AI_COMPLETION_PROVIDER=openai`) | `sk-...` |
| `RATE_LIMIT_LOGIN` | Límite de login por IP | `5/minute` |
| `RATE_LIMIT_REGISTER` | Límite de registro por IP | `3/minute` |

Se gestionan mediante `pydantic-settings` en `core/config.py`, que carga los valores desde `apps/api/.env`.

---

## Integraciones externas (`integrations/`)

| Cliente | Archivo | Propósito |
|---|---|---|
| AniList | `anilist_client.py` | Búsqueda de anime/manga (GraphQL) |
| RAWG | `rawg_client.py` | Búsqueda de videojuegos y detalle |
| Bedrock (Claude) | `bedrock/client.py` | Implementación LLM vía AWS Bedrock |
| OpenAI | `llm.py` (`OpenAIJsonlClient`) | Implementación LLM local/desarrollo |
| YouTube | `youtube/client.py` | Descubrimiento de contenido |

El protocolo `JsonLlm` (en `llm.py`) abstrae la generación JSON estructurada: los servicios dependen del protocolo, y `get_llm_client()` (ADR-014) resuelve el proveedor según entorno.
