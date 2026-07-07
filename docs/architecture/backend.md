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
| uvicorn | — | Servidor ASGI para desarrollo y producción |

---

## Estructura de carpetas

```
apps/api/app/
├── routers/           # Endpoints agrupados por recurso (auth, entries)
├── services/          # Lógica de negocio (sin acceso directo a BD)
├── repositories/      # Queries SQLAlchemy, única capa que toca la BD
├── schemas/           # Pydantic models para request y response
├── models/            # SQLAlchemy models (definición de tablas)
├── core/
│   ├── config.py      # Settings desde variables de entorno (pydantic-settings)
│   ├── security.py    # JWT, hashing, dependencias de autenticación
│   ├── database.py    # Session factory y dependencia get_db
│   ├── dependencies.py# Inyección de dependencias para repos/servicios
│   ├── google_auth.py # Integración y validación de tokens de Google OAuth
│   ├── rate_limiter.py# Configuración de SlowAPI para rate limiting
│   ├── uploads.py     # Manejo de subida y validación de imágenes
│   └── validators.py  # Validadores reutilizables (como normalización de emails)
└── main.py            # Entry point, instancia FastAPI, registro de routers y middlewares

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
- **Repository**: única capa con acceso a la base de datos. Recibe y devuelve modelos SQLAlchemy o tipos primitivos.
- **Los routers nunca acceden a la BD directamente.**

---

## Flujo completo: crear entrada

```mermaid
sequenceDiagram
    participant Cliente
    participant Router as entries_router
    participant Service as EntryService
    participant Repo as EntryRepository
    participant DB as PostgreSQL

    Cliente->>Router: POST /api/v1/entries { title, type, status }
    Router->>Router: Valida token JWT (Depends)
    Router->>Router: Valida body con CreateEntrySchema (Pydantic)
    Router->>Service: entry_service.create(user_id, data)
    Service->>Service: Verifica reglas de negocio
    Service->>Repo: entry_repo.create(user_id, data)
    Repo->>DB: INSERT INTO entries ...
    DB-->>Repo: Entry row
    Repo-->>Service: Entry model
    Service-->>Router: Entry model
    Router-->>Cliente: 201 Created { EntryResponse }
```

### Ejemplo de código

```python
# routers/entries.py
@router.post("/", response_model=EntryResponse, status_code=201)
async def create_entry(
    form_data: EntryCreateForm = Depends(),
    cover_image: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user),
    service: EntryService = Depends(get_entry_service),
) -> EntryResponse:
    data = form_data.to_entry_create()
    return await service.create(user_id=current_user.id, data=data)


# services/entry_service.py
class EntryService:
    def __init__(self, repo: EntryRepository) -> None:
        self.repo = repo

    async def create(self, user_id: UUID, data: EntryCreate) -> Entry:
        return await self.repo.create(user_id=user_id, data=data)


# repositories/entry_repository.py
class EntryRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, user_id: UUID, data: EntryCreate) -> Entry:
        entry = Entry(
            user_id=user_id,
            title=data.title,
            type=data.type,
            status=data.status,
            rating=data.rating,
            year=data.year,
            notes=data.notes,
            cover_image=data.cover_image,
        )
        self.db.add(entry)
        await self.db.commit()
        await self.db.refresh(entry)
        return entry
```

---

## Autenticación

- **Mecanismo**: JWT Bearer tokens (OAuth2PasswordBearer).
- **Librería**: `PyJWT` para firmar/verificar, `bcrypt` para hashear contraseñas.
- **Flujo**:
  1. El cliente hace `POST /api/v1/auth/login` con email y contraseña.
  2. El backend verifica las credenciales y devuelve un `access_token` (JWT).
  3. En peticiones protegidas, el cliente envía el token en el header `Authorization: Bearer <token>`.
  4. La dependencia `get_current_user` en `core/security.py` decodifica y valida el token en cada request.

```python
# core/security.py
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_access_token(token)  # lanza 401 si inválido
    user_id = payload.get("sub")
    ...
    repo = UserRepository(db)
    user = await repo.get_by_id(UUID(user_id))
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return user
```

---

## Endpoints de la API

| Método | Ruta | Descripción | Autenticación |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Registro de nuevo usuario local | No |
| `POST` | `/api/v1/auth/login` | Login local (devuelve JWT) | No |
| `POST` | `/api/v1/auth/google` | Login/Registro con Google OAuth | No |
| `GET` | `/api/v1/entries` | Lista entradas del usuario autenticado (con filtros y paginación) | Sí |
| `POST` | `/api/v1/entries` | Crea una nueva entrada (multipart form) | Sí |
| `GET` | `/api/v1/entries/{id}` | Detalle de una entrada | Sí |
| `PUT` | `/api/v1/entries/{id}` | Actualiza metadatos de una entrada | Sí |
| `POST` | `/api/v1/entries/{id}/cover` | Sube/actualiza la imagen de portada de una entrada | Sí |
| `DELETE` | `/api/v1/entries/{id}` | Elimina una entrada | Sí |
| `GET` | `/health` | Endpoint de salud de la API | No |

La documentación interactiva (Swagger UI) está disponible en `/docs` (cuando `DEBUG=true`) y el esquema OpenAPI en `/openapi.json`.

---

## Variables de entorno requeridas

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DATABASE_URL` | DSN de conexión a PostgreSQL | `postgresql+asyncpg://user:pass@localhost:5432/glyphlog` |
| `SECRET_KEY` | Clave secreta para firmar JWT (mínimo 32 caracteres aleatorios) | `supersecretkey...` |
| `ALGORITHM` | Algoritmo de firma JWT | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Tiempo de expiración del token en minutos | `60` |
| `DEBUG` | Booleano para activar el modo de depuración y las UIs de documentación | `True` o `False` |
| `ALLOWED_ORIGINS` | Orígenes CORS permitidos (lista JSON en el `.env`) | `["http://localhost:5173"]` |
| `GOOGLE_CLIENT_ID` | Identificador de cliente de Google Cloud Console (Google OAuth) | `123456-abcdef.apps.googleusercontent.com` |
| `RATE_LIMIT_LOGIN` | Límite de login por IP | `5/minute` |
| `RATE_LIMIT_REGISTER` | Límite de registro por IP | `3/minute` |

Se gestionan mediante `pydantic-settings` en `core/config.py`, que carga los valores desde el archivo `.env` del directorio raíz de la app (apps/api/.env).
