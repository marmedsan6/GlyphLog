# Estrategia de Despliegue

## Entornos

| Entorno | Frontend | Backend | Base de datos |
|---|---|---|---|
| **Development** (local) | Vite dev server en `localhost:5173` | uvicorn en `localhost:8000` | PostgreSQL en Docker (`localhost:5432`) |
| **Production** | Nginx (estáticos) + Cloudflare | uvicorn detrás de Nginx | PostgreSQL en Oracle Cloud (Always Free) |

> La producción corre en una VM de Oracle Cloud con Nginx como proxy reverso y servidor de estáticos, y Cloudflare para HTTPS/CDN. Ver `docs/DEV_VPS_GUIDE.md` para el detalle operativo del VPS.

---

## Desarrollo local

El entorno de desarrollo está diseñado para arrancar rápido sin configurar infraestructura manualmente.

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

- **Servidor**: Nginx sirve los estáticos compilados en `apps/web/dist/`.
- **Proceso**: `pnpm build` genera los estáticos; Nginx los expone.
- **CDN/HTTPS**: Cloudflare (proxy + certificados).
- **SPA routing**: Nginx aplica `try_files ... /index.html` para que React Router funcione en navegación directa.

### Backend

- **Servidor**: uvicorn detrás de Nginx como proxy reverso.
- **Proceso**: Nginx redirige `/api/v1/` y `/uploads/` al contenedor/processo de FastAPI.
- **Migraciones en deploy**: `alembic upgrade head` antes de arrancar.

### Base de datos

- **Proveedor**: Oracle Cloud Infrastructure — instancia Always Free de PostgreSQL.
- **Acceso**: solo accesible desde el backend en producción. No expuesto públicamente.
- **Backups**: snapshot periódico desde la consola de Oracle Cloud.

---

## Consideraciones de CORS

El backend permite únicamente los orígenes legítimos mediante `CORSMiddleware` en `main.py`.

| Entorno | Orígenes permitidos |
|---|---|
| Development | `http://localhost:5173` |
| Production | dominio real de GlyphLog (ajustado por `ALLOWED_ORIGINS`) |

`allowed_origins` se define en `core/config.py` y es parseado por Pydantic-settings como lista de strings desde el `.env`.
