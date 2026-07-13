# Sesión de Trabajo — 13 de Julio de 2026: Despliegue de Batch de Fixes y Características a Producción

## Resumen de la sesión
Se ha verificado la calidad del código en local, consolidado todas las modificaciones de la Fase 1 y del Batch de Fixes, realizado la mezcla a la rama `main` y desplegado con éxito en la máquina virtual de Oracle Cloud detrás de Cloudflare.

---

## Log de Cambios Desplegados

### 1. Fuga de Caché de TanStack Query (P0 Blocker)
* Agregada la llamada `queryClient.clear()` en el flujo de logout del store de Zustand (`auth.store.ts`).
* Configurado interceptor de respuesta en Axios (`apiClient.ts`) para limpiar la sesión y la caché de inmediato ante respuestas HTTP 401, redirigiendo al login.
* Mockeada la limpieza de caché en los tests unitarios.

### 2. Google OAuth Local (P1 Critical)
* Añadidos los placeholders de entorno `GOOGLE_CLIENT_ID` y `VITE_GOOGLE_CLIENT_ID` en `docker-compose.yml` para posibilitar el login con Google en entornos Docker locales.
* Documentado el proceso de configuración en `docs/SETUP.md`.

### 3. Visibilidad en Modo Oscuro (P2 Major)
* Corregido el dropdown del autocompletado inteligente en modo oscuro mediante una utilidad centralizada de opacidad en oklch (`tailwind-opacity.ts`), solucionando la incompatibilidad de Tailwind 3.x con opacidades sobre variables CSS en oklch.

### 4. Recortador de Portadas (P3 Minor)
* Integrado `react-easy-crop` en el frontend para permitir zoom, paneo y recorte de imágenes de portada subidas localmente antes de subirlas al API.
* Agrandado el contenedor visual de portadas en la página de detalle de entradas.

### 5. Características de Búsqueda, Ordenamiento e Integración de Catálogos (Fase 1)
* Endpoint de búsqueda y ordenamiento avanzado en base de datos.
* Barra de búsqueda inteligente en el header de la app.
* Integración concurrente de catálogos externos (MAL y RAWG) con control de caché en memoria de 5 min TTL para mitigar rate-limits.

---

## Proceso de Despliegue

1. **Pruebas y Validación**:
   * Ejecutado `pnpm test` (210+ tests pasando).
   * Ejecutado `pnpm lint` (0 errores).
   * Ejecutado `pnpm build` (compilación a producción limpia y sin errores).
2. **Git Merge y Push**:
   * Creada y empujada la rama `feature/batch-fixes-julio-2026`.
   * Integrado el código mediante merge `--no-ff` en `main`.
   * Cambios empujados a `origin/main` (Commit SHA: `08ffa73df6133d620e32446fa372733b4f7ce47c`).
3. **Ejecución en Servidor**:
   * SSH a la máquina virtual (`glyphlog` alias a `143.47.48.211`).
   * Ejecución de `/opt/glyphlog/scripts/deploy.sh`:
     * Git pull.
     * Docker Compose rebuild de `glyphlog-nginx` y `glyphlog-api-prod`.
     * Ejecución de migraciones de base de datos con Alembic.
     * Healthcheck local exitoso.

---

## Verificación de Salud en Producción
* **Frontend SPA**: `https://glyphlog.qzz.io/` -> HTTP 200 OK
* **Health Check**: `https://glyphlog.qzz.io/health` -> HTTP 200 OK (responde "OK")
* **API Endpoints**: `https://glyphlog.qzz.io/api/v1/entries/` -> HTTP 401 Unauthorized (API viva y protegida)
