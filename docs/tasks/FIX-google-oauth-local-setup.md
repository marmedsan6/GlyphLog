# [SETUP] Configurar Google OAuth en entorno local

> **Estado:** backlog
> **Prioridad:** alta
> **Severidad:** P1 — critical (feature principal no funciona en dev)
> **Dependencias:** ninguna

## Contexto

Google OAuth funciona correctamente en producción (`https://glyphlog.qzz.io`) pero no está configurado en el entorno local de desarrollo. Las variables `GOOGLE_CLIENT_ID` (backend) y `VITE_GOOGLE_CLIENT_ID` (frontend) no están presentes en `docker-compose.yml` ni en los `.env` locales. El código tiene degradación graciosa (503 en backend, botón oculto en frontend), pero el resultado es que la autenticación con Google es inusable en local.

El Client ID de Google (`891980338974-gfirv1ufi0lm34gtt0tuvvsdg2nkrom4.apps.googleusercontent.com`) es el mismo para dev y producción, y `http://localhost:5173` ya está registrado como origen autorizado en Google Cloud Console.

## Objetivo

Hacer que el botón "Continuar con Google" funcione en el entorno de desarrollo local con Docker Compose.

## Bug reportado

**Descripción:** El botón de Google OAuth no aparece en la página de login cuando se ejecuta la app en local.

**Pasos para reproducir:**
1. Levantar la app con `docker compose up -d`
2. Navegar a `http://localhost:5173/login`
3. Observar: no aparece el botón "Continuar con Google"

**Resultado esperado:** El botón "Continuar con Google" aparece y permite autenticarse.
**Resultado actual:** El botón no se renderiza porque `VITE_GOOGLE_CLIENT_ID` está vacío.

## Análisis de causa raíz

**Archivo(s) afectado(s):**
- `docker-compose.yml` — falta `GOOGLE_CLIENT_ID` en el servicio `api` y `VITE_GOOGLE_CLIENT_ID` en el servicio `web`

**Causa identificada:** Las variables de entorno de Google OAuth no se incluyeron en el `docker-compose.yml` local porque originalmente eran opcionales. Al no estar definidas, el frontend oculta el botón y el backend devuelve 503.

**Impacto:** Solo afecta al entorno de desarrollo local. Producción ya está configurado correctamente.

## Tareas técnicas

- [ ] Añadir `GOOGLE_CLIENT_ID` al servicio `api` en `docker-compose.yml` (leer de variable de entorno del host con `${GOOGLE_CLIENT_ID:-}`)
- [ ] Añadir `VITE_GOOGLE_CLIENT_ID` al servicio `web` en `docker-compose.yml` (leer de variable de entorno del host con `${VITE_GOOGLE_CLIENT_ID:-}`)
- [ ] Documentar en `docs/SETUP.md` o en el `.env.example` que el usuario debe exportar `GOOGLE_CLIENT_ID` y `VITE_GOOGLE_CLIENT_ID` en su shell antes de `docker compose up`
- [ ] Verificar que el flujo completo funciona: botón visible → click → redirect a Google → callback → login exitoso

## Criterios de aceptación

- ✅ El botón "Continuar con Google" aparece en `/login` cuando se ejecuta `docker compose up -d` con las variables de entorno configuradas
- ✅ El flujo completo de OAuth funciona en local (login y registro)
- ✅ Si las variables no están configuradas, la degradación graciosa sigue funcionando (botón oculto, 503 en backend)
- ✅ No se introducen secretos hardcodeados en el repositorio
- ✅ `docker compose up -d` sigue funcionando sin las variables (no rompe el setup para quien no quiera Google OAuth)

## Notas técnicas

- El Client ID es el mismo para dev y prod: `891980338974-gfirv1ufi0lm34gtt0tuvvsdg2nkrom4.apps.googleusercontent.com`
- `http://localhost:5173` ya está en Authorized JavaScript origins de Google Cloud Console
- El redirect_uri se calcula dinámicamente como `${window.location.origin}/login`, así que funciona sin cambios
- Usar `${GOOGLE_CLIENT_ID:-}` en docker-compose permite que sea opcional: si no está exportada, queda vacía y la degradación graciosa actúa

## Archivos relevantes

- `docker-compose.yml` — servicios `api` y `web`
- `.env.production.example` — referencia de cómo se configura en producción
- `apps/api/app/core/config.py` — `google_client_id: str = ""` (default vacío)
- `apps/web/src/lib/env.ts` — `googleClientId` desde `VITE_GOOGLE_CLIENT_ID`

## Validación INVEST

- [x] **Independent:** No depende de otros issues. Es pura configuración.
- [x] **Negotiable:** El enfoque (env vars del host vs .env file) es negociable.
- [x] **Valuable:** Permite desarrollar y testear Google OAuth en local.
- [x] **Estimable:** 15-20 minutos.
- [x] **Small:** Solo tocar docker-compose.yml y documentación.
- [x] **Testable:** El botón aparece o no aparece. Binario.
