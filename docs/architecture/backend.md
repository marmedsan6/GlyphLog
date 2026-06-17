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
│   └── database.py    # Session factory y dependencia get_db
└── main.py            # Entry point, instancia FastAPI, registro de routers
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
    data: CreateEntrySchema,
    current_user: User = Depends(get_current_user),
    service: EntryService = Depends(get_entry_service),
) -> EntryResponse:
    return await service.create(user_id=current_user.id, data=data)


# services/entry_service.py
class EntryService:
    def __init__(self, repo: EntryRepository) -> None:
        self.repo = repo

    async def create(self, user_id: UUID, data: CreateEntrySchema) -> Entry:
        return await self.repo.create(user_id=user_id, data=data)


# repositories/entry_repository.py
class EntryRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, user_id: UUID, data: CreateEntrySchema) -> Entry:
        entry = Entry(user_id=user_id, **data.model_dump())
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
    payload = decode_token(token)  # lanza 401 si inválido
    user = await user_repo.get_by_id(db, payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user
```

---

## Endpoints previstos

| Método | Ruta | Descripción | Autenticación |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Registro de nuevo usuario | No |
| `POST` | `/api/v1/auth/login` | Login, devuelve JWT | No |
| `GET` | `/api/v1/entries` | Lista entradas del usuario autenticado | Sí |
| `POST` | `/api/v1/entries` | Crea una nueva entrada | Sí |
| `GET` | `/api/v1/entries/{id}` | Detalle de una entrada | Sí |
| `PUT` | `/api/v1/entries/{id}` | Actualiza una entrada | Sí |
| `DELETE` | `/api/v1/entries/{id}` | Elimina una entrada | Sí |

La documentación interactiva (Swagger UI) está disponible en `/docs` y el esquema OpenAPI en `/openapi.json`.

---

## Variables de entorno requeridas

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DATABASE_URL` | DSN de conexión a PostgreSQL | `postgresql+asyncpg://user:pass@localhost:5432/glyphlog` |
| `SECRET_KEY` | Clave secreta para firmar JWT (mínimo 32 caracteres aleatorios) | `supersecretkey...` |
| `ALGORITHM` | Algoritmo de firma JWT | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Tiempo de expiración del token en minutos | `60` |

Se gestionan mediante `pydantic-settings` en `core/config.py`, que carga los valores desde el archivo `.env` del directorio raíz de la app.
