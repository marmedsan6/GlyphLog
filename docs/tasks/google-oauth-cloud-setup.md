# [SETUP] Configurar Google Cloud Console para OAuth

> **Estado:** backlog
> **Prioridad:** alta
> **Dependencias:** ninguna

## Contexto

La historia #16 implementa el endpoint `POST /api/v1/auth/google` que
valida id_tokens emitidos por Google Sign-In. Para que ese endpoint
funcione en un entorno real, hay que registrar la aplicación en Google
Cloud Console, crear credenciales de tipo "Aplicación web" y configurar
los orígenes autorizados. **Este setup es opcional en desarrollo** — la
app arranca y funciona sin `GOOGLE_CLIENT_ID`, devolviendo 503 en el
endpoint de Google.

## Objetivo

Dejar Google Cloud Console listo para que el botón "Continuar con Google"
de GlyphLog funcione tanto en local como en producción.

## Tareas técnicas

### 1. Crear (o seleccionar) un proyecto en Google Cloud

- Ir a https://console.cloud.google.com/
- Crear un nuevo proyecto o reutilizar uno existente
- Anotar el **Project ID** (lo necesitaremos más adelante)

### 2. Habilitar la API de Google Identity (opcional)

- Menú → **APIs & Services** → **Library**
- Buscar "Google Identity" o "Google+ API" y habilitarla
- En la mayoría de los casos Google Sign-In funciona sin necesidad de
  habilitar APIs adicionales, pero algunas cuentas lo requieren

### 3. Configurar la pantalla de consentimiento OAuth

- Menú → **APIs & Services** → **OAuth consent screen**
- Tipo: **External** (a menos que uses Google Workspace)
- Rellenar:
  - **App name**: GlyphLog
  - **User support email**: tu email
  - **Developer contact information**: tu email
- **Scopes** (paso crítico): añadir:
  - `https://www.googleapis.com/auth/userinfo.email`
  - `https://www.googleapis.com/auth/userinfo.profile`
  - `openid`
- Guardar

### 4. Crear credenciales OAuth

- Menú → **APIs & Services** → **Credentials** → **Create Credentials**
  → **OAuth client ID**
- Tipo: **Web application**
- Nombre: `GlyphLog Web` (o el que prefieras)
- **Authorized JavaScript origins**:
  - `http://localhost:5173` (desarrollo)
  - `https://tu-dominio-produccion.com` (cuando despliegues)
- **Authorized redirect URIs** (Google Identity Services puede no
  necesitarlas, pero es buena práctica añadirlas):
  - `http://localhost:5173`
  - `https://tu-dominio-produccion.com`
- Pulsar **Create**
- **Copiar el Client ID** resultante (formato: `xxxxx.apps.googleusercontent.com`)

### 5. Configurar las variables de entorno

#### Backend (`apps/api/.env`)

```bash
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

#### Frontend (`apps/web/.env.local`)

```bash
VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

> ⚠️ El MISMO Client ID va en backend y frontend. El backend lo usa
> para verificar la firma del id_token. El frontend lo usa para iniciar
> el flujo de Google Sign-In.

### 6. Verificar la configuración

- Reiniciar backend: `docker compose restart api` (o `pnpm dev`)
- Reiniciar frontend: `pnpm --filter web dev`
- Ir a `http://localhost:5173/login`
- El botón "Continuar con Google" debe aparecer
- Hacer click → seleccionar cuenta → debería iniciar sesión y redirigir
  a `/collection`

## Criterios de aceptación

- ✅ El proyecto de Google Cloud existe
- ✅ La pantalla de consentimiento está configurada con los scopes mínimos
- ✅ Las credenciales OAuth de tipo "Web application" están creadas
- ✅ `http://localhost:5173` está en **Authorized JavaScript origins**
- ✅ El mismo Client ID está en `apps/api/.env` y `apps/web/.env.local`
- ✅ El botón de Google aparece en `/login` y `/register`
- ✅ El login con Google funciona y redirige a `/collection`

## Notas técnicas

### ¿Por qué "Web application" y no "Android" o "iOS"?

GlyphLog es una SPA que se ejecuta íntegramente en el navegador. Las
credenciales de tipo "Web application" son las correctas para el flujo
de Google Identity Services desde JavaScript.

### ¿Por qué el Client ID es público?

El Client ID de OAuth NO es un secreto. Va en el bundle del frontend
(visible para cualquier usuario). Lo que es secreto es el **Client
Secret**, que **nunca** debe estar en el frontend ni en el repositorio
— y de hecho no lo necesitamos para este flujo (verificación de
id_token en el backend).

### Modo degradado (sin GOOGLE_CLIENT_ID)

Si la variable no está configurada:
- La app arranca sin errores
- El botón de Google NO se renderiza en el frontend (degradación graciosa)
- El endpoint `POST /api/v1/auth/google` responde **503** con mensaje
  en español

Esto permite desarrollar y testear el resto de la app sin depender de
Google Cloud. Útil para CI y para onboarding de nuevos desarrolladores.

### Producción

Para desplegar en producción hay que:
1. Añadir el dominio real a **Authorized JavaScript origins**
2. Publicar la app en la pantalla de consentimiento (pasar de
   "Testing" a "In production") — Google requiere verificación si
   pides scopes sensibles, pero los de email/profile son básicos
3. Actualizar `GOOGLE_CLIENT_ID` y `VITE_GOOGLE_CLIENT_ID` en el
   entorno de producción (variables de entorno del PaaS, NO en el
   repositorio)

### Diferencia entre `google-auth` (backend) y `@react-oauth/google` (frontend)

- **Frontend** usa `@react-oauth/google` para abrir el popup de Google
  Sign-In y obtener un `id_token` (JWT).
- **Backend** usa `google-auth` para verificar la firma de ese JWT y
  extraer los claims (`sub`, `email`, `email_verified`, etc.).
- El backend NUNCA abre popups ni interactúa con el navegador.
- El frontend NUNCA verifica la firma del token — confía en que el
  backend lo hará.

### Seguridad: ¿qué pasa si alguien falsifica un id_token?

`google-auth` descarga automáticamente los certificados públicos de
Google y verifica la firma RSA. Un token auto-firmado o con clave
incorrecta falla la verificación con `ValueError`, que traducimos a
401 "Token de Google inválido o expirado". Adicionalmente validamos
manualmente `iss` y `email_verified` para evitar ataques más
sofisticados.

## Archivos relevantes

- `apps/api/app/core/google_auth.py` — verificación de tokens
- `apps/api/app/routers/auth.py` — endpoint `POST /api/v1/auth/google`
- `apps/web/src/components/shared/google-login-button.tsx` — botón
  frontend (Historia #17)

## Referencias externas

- [Google Identity — Verify the integrity of the ID token](https://developers.google.com/identity/sign-in/web/backend-auth)
- [Google OAuth 2.0 — Web server flow](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Set up OAuth consent screen](https://support.google.com/cloud/answer/10311615)
