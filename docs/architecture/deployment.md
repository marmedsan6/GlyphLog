# Estrategia de Despliegue

## Entornos

| Entorno | Frontend | Backend | Base de datos |
|---|---|---|---|
| **Development** (local) | Vite dev server en `localhost:5173` | uvicorn en `localhost:8000` | PostgreSQL en Docker (`localhost:5432`) |
| **Staging** (futuro) | Preview deploy en Vercel/Netlify | Instancia separada en Railway/Render | BD de staging en Oracle Cloud o Neon |
| **Production** | Archivos estáticos en Vercel o Netlify | Railway o Render (free tier) | PostgreSQL en Oracle Cloud (Always Free) |

---

## Desarrollo local

El entorno de desarrollo está diseñado para arrancar rápido sin necesidad de configurar infraestructura manualmente.

### Paso 1 — Levantar infraestructura con Docker

```bash
# Desde la raíz del monorepo
docker compose up -d
```

Esto levanta un contenedor de PostgreSQL accesible en `localhost:5432`. Los datos persisten en un volumen Docker.

### Paso 2 — Iniciar frontend y backend

```bash
# Ambos en paralelo (recomendado)
pnpm dev

# O de forma individual
pnpm --filter web dev     # Frontend en http://localhost:5173
pnpm --filter api dev     # Backend en http://localhost:8000
```

### Paso 3 — Aplicar migraciones

```bash
cd apps/api
alembic upgrade head
```

### Puertos por defecto

| Servicio | Puerto | URL |
|---|---|---|
| Frontend (Vite) | 5173 | `http://localhost:5173` |
| Backend (uvicorn) | 8000 | `http://localhost:8000` |
| PostgreSQL | 5432 | `localhost:5432` |
| Swagger UI | 8000 | `http://localhost:8000/docs` |

---

## Producción

### Frontend

- **Proveedor**: Vercel (preferido) o Netlify.
- **Proceso**: `pnpm build` genera archivos estáticos en `apps/web/dist/`. El proveedor sirve estos archivos desde su CDN global.
- **Configuración**: la variable `VITE_API_URL` apunta a la URL de producción del backend.
- **SPA routing**: se necesita una regla de rewrite (`/* → /index.html`) para que React Router funcione correctamente en navegación directa.

### Backend

- **Proveedor**: Railway o Render (free tier suficiente para uso personal).
- **Proceso de deploy**: push a `main` → build de la imagen Docker → deploy automático.
- **Comando de inicio**: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- **Migraciones en deploy**: el proceso de inicio ejecuta `alembic upgrade head` antes de arrancar el servidor.

### Base de datos

- **Proveedor**: Oracle Cloud Infrastructure — instancia Always Free de PostgreSQL.
- **Acceso**: solo accesible desde el backend en producción. No expuesto públicamente.
- **Backups**: configurar snapshot diario desde la consola de Oracle Cloud.

---

## Variables de entorno por entorno

| Variable | Development | Production |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000/api/v1` | `https://api.glyphlog.app/api/v1` |
| `VITE_API_BASE_URL` | `http://localhost:8000` | `https://api.glyphlog.app` |
| `VITE_GOOGLE_CLIENT_ID` | Client ID de Google (opcional) | Client ID de Google (secreto/público) |
| `DATABASE_URL` | `postgresql+asyncpg://glyphlog:glyphlog@localhost:5432/glyphlog` | DSN de Oracle Cloud (secreto) |
| `SECRET_KEY` | Cualquier valor largo | Cadena aleatoria de 64+ caracteres (secreto) |
| `ALGORITHM` | `HS256` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` (24h, cómodo en dev) | `60` |
| `DEBUG` | `True` | `False` |
| `GOOGLE_CLIENT_ID` | Client ID de Google (opcional) | Client ID de Google (secreto) |
| `ALLOWED_ORIGINS` | `["http://localhost:5173"]` | `["https://glyphlog.app"]` |

Las variables de producción se configuran en el panel del proveedor (Railway/Render) y nunca se commitean al repositorio.

---

## Consideraciones de CORS

El backend debe permitir únicamente los orígenes legítimos. Se configura en `apps/api/app/main.py` mediante `CORSMiddleware`.

| Entorno | Orígenes permitidos |
|---|---|
| Development | `http://localhost:5173` |
| Production | `https://glyphlog.app`, `https://www.glyphlog.app` (ajustar al dominio real) |

```python
# apps/api/app/main.py
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,  # cargado desde variable de entorno
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
```

`allowed_origins` se define en `core/config.py` y es parseado automáticamente por Pydantic-settings como una lista de strings a partir de una cadena JSON o lista en el `.env`.
