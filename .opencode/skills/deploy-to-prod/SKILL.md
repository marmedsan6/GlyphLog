---
name: deploy-to-prod
description: Use when deploying changes from a feature branch to production. Triggers on: deploy to prod, promote to production, subir a PRO, deploy cambios, hacer deploy, merge and deploy, ship to prod. Covers env config, branch merge, build args, smoke tests, and post-deploy verification. Specific to GlyphLog (Oracle Cloud + Cloudflare + Docker + nginx + qzz.io domain).
---

# Deploy to Production — GlyphLog

Skill para desplegar cambios en el servidor de producción de GlyphLog. Asume que ya validaste la feature en local (tests, build, lint) y que la rama está commiteada.

## When to use

- El usuario dice "subir a PRO", "deploy", "promote to production", "merge and deploy", "ship to prod"
- Hay una rama `feature/*` lista para mergear a `main` y desplegar
- El usuario tiene acceso SSH al servidor de producción o ejecuta el deploy desde local con `scripts/deploy.sh`

## Context — GlyphLog production stack

- **Dominio:** `https://glyphlog.qzz.io` (Cloudflare Tunnel → Oracle Cloud VM)
- **Servidor:** Oracle Cloud VM (Ubuntu, Docker + Docker Compose)
- **SSL:** nginx con certificados montados como volumen (`./certs`)
- **Frontend:** nginx sirve el build de Vite como estáticos
- **Backend:** FastAPI en contenedor `api`, detrás de nginx con proxy_pass
- **DB:** PostgreSQL 15 en contenedor, volumen named `postgres_data`
- **Deploy script:** `scripts/deploy.sh` (hace git pull + build + alembic upgrade + health check)
- **Env file:** `.env.production` (NO commiteado, en el servidor)

## Workflow

### Phase 1: Pre-deploy verification

Antes de tocar nada, verifica que la rama está lista:

```bash
# 1. ¿Estamos en la rama correcta?
git branch --show-current  # debe ser feature/* lista para mergear

# 2. ¿Hay cambios sin commitear?
git status --short  # debe estar limpio

# 3. ¿Los tests pasan?
cd apps/api && uv run --with pytest --with pytest-asyncio --with httpx \
  --with "sqlalchemy[asyncio]" --with asyncpg --with bcrypt \
  --with "pydantic-settings" --with "fastapi[standard]" --with "google-auth" \
  --with "pydantic[email]" --with slowapi --with pyjwt --with python-multipart \
  --with email-validator --with alembic --with faker --with requests pytest -q
cd apps/web && pnpm test
cd apps/web && pnpm build

# 4. ¿El lint está limpio?
cd apps/api && uv run --with ruff ruff check app/
cd apps/web && pnpm lint
cd apps/web && pnpm exec tsc --noEmit

# 5. ¿El Dockerfile compila?
docker build -t glyphlog-api-test ./apps/api  # solo si no se ha hecho antes
```

Si algo falla, **NO** procedas. Reporta al usuario qué falló y espera instrucción.

### Phase 2: Env vars y secrets

Pregunta al usuario qué secrets/variables nuevas necesita este deploy. Las vars comunes:

| Var | Backend (Docker) | Frontend (build arg) |
|-----|------------------|----------------------|
| `GOOGLE_CLIENT_ID` | ✅ (.env.production) | ✅ (build arg) |
| `VITE_API_URL` | — | ✅ (build arg) |
| `VITE_API_BASE_URL` | — | ✅ (build arg) |
| `ALLOWED_ORIGINS` | ✅ (.env.production) | — |
| `SECRET_KEY` | ✅ (.env.production) | — |
| `DATABASE_URL` | ✅ (.env.production) | — |
| `DEBUG` | ✅ (.env.production) | — |

**Regla:** NUNCA hardcodear secrets en el código. El `VITE_GOOGLE_CLIENT_ID` se pasa como build arg en `docker-compose.prod.yml`, NO en el Dockerfile.

**Si la feature requiere nuevas vars en build args** (ej: `VITE_*`):
- Actualizar `docker-compose.prod.yml` sección `nginx.build.args`
- Documentar en `.env.example`
- Mencionarlo al usuario en este paso

### Phase 3: Push y merge

```bash
# 1. Push de la rama feature
git push -u origin feature/<nombre>

# 2. Verificar que está en GitHub
gh pr list --head feature/<nombre>  # o git ls-remote origin feature/<nombre>

# 3. ¿El usuario quiere abrir PR o mergear directo?
#   - Si hay equipo: abrir PR, esperar review
#   - Si es proyecto personal: mergear directo con --no-ff

# 4. Merge a main
git checkout main
git pull origin main
git merge --no-ff feature/<nombre> -m "Merge: <descripción corta>"
git push origin main
```

### Phase 4: Configurar .env.production en el servidor

**El usuario debe hacer esto manualmente** (SSH o panel), porque requiere acceso al servidor:

```bash
# SSH al servidor
ssh usuario@<ip-servidor>

# Navegar al directorio del proyecto
cd ~/GlyphLog  # o donde esté

# Editar .env.production con las nuevas vars
nano .env.production  # o vim

# Verificar que las vars están (sin imprimir valores sensibles)
grep -E "^(GOOGLE_CLIENT_ID|ALLOWED_ORIGINS|SECRET_KEY|DEBUG)=" .env.production | cut -d= -f1
```

**NUNCA** pegar el contenido de `.env.production` en el chat. **NUNCA** commitearlo.

### Phase 5: Deploy

```bash
# Si el usuario ejecuta el deploy desde su local (y tiene acceso SSH al servidor):
ssh usuario@<ip-servidor> "cd ~/GlyphLog && bash scripts/deploy.sh"

# Si el usuario tiene el repo clonado en el servidor y ejecuta desde ahí:
ssh usuario@<ip-servidor>
cd ~/GlyphLog
bash scripts/deploy.sh
```

El script `scripts/deploy.sh`:
1. `git pull origin main` (trae los últimos commits)
2. `docker compose -f docker-compose.prod.yml up -d --build` (rebuild de imágenes)
3. `docker compose -f docker-compose.prod.yml exec -T api alembic upgrade head` (migraciones)
4. Health check: `curl http://localhost:80/health` y `curl http://localhost:80/api/v1/entries`

**Si las vars de build (`VITE_*`) cambiaron**, el rebuild es necesario (Vite las compila en el bundle en build-time, no en runtime).

### Phase 6: Post-deploy verification

```bash
# 1. Health check público
curl -I https://glyphlog.qzz.io/health  # debe ser 200
curl -I https://glyphlog.qzz.io/        # debe ser 200 (SPA)

# 2. API viva
curl -I https://glyphlog.qzz.io/api/v1/entries  # debe ser 401 (sin auth)

# 3. Verificar que Google OAuth está disponible
curl -I https://glyphlog.qzz.io/api/v1/auth/google  # OPTIONS debe funcionar (CORS)

# 4. Probar login con Google manualmente
# El usuario abre https://glyphlog.qzz.io/login
# Click en "Continuar con Google" → debe aparecer el popup

# 5. Logs por si hay errores
ssh usuario@servidor "cd ~/GlyphLog && docker compose -f docker-compose.prod.yml logs --tail=100 api"
ssh usuario@servidor "cd ~/GlyphLog && docker compose -f docker-compose.prod.yml logs --tail=100 nginx"
```

### Phase 7: Limpieza y cierre

```bash
# Cerrar issues de GitHub (en el repo)
gh issue close <numero> --comment "Cerrado por merge en <commit-sha>"

# Borrar rama local
git branch -d feature/<nombre>
git push origin --delete feature/<nombre>

# Actualizar memory bank
# (esto lo hace el agente, no el usuario)
```

## Failure modes y recovery

| Error | Causa probable | Fix |
|-------|----------------|-----|
| Build falla: `Cannot find module 'X'` | Falta `pnpm install` antes de `pnpm build` | `pnpm install` en `apps/web/` |
| Build falla: `pip: command not found` | Dockerfile del API no tiene pip | Verificar `apps/api/Dockerfile` |
| CORS error en navegador: `Access-Control-Allow-Origin` | `ALLOWED_ORIGINS` no incluye el dominio | Editar `.env.production` y rebuildear API |
| 503 en `/auth/google` | `GOOGLE_CLIENT_ID` vacío o incorrecto | Verificar var en `.env.production` y reiniciar API |
| "Popup blocked" en navegador | El sitio no es HTTPS | El dominio `qzz.io` es HTTPS, no debería pasar |
| Login con Google falla con 401 | `aud` del id_token no coincide | Verificar que `GOOGLE_CLIENT_ID` es el MISMO en backend y Google Cloud |
| Login con Google falla con 403 (blocked) | Origen no autorizado en Google Cloud | Añadir `https://glyphlog.qzz.io` a Authorized JavaScript origins |
| "Google hasn't been fully configured" | OAuth consent screen en "Testing" sin test users | Añadir el email del usuario como test user, o publicar la app |

## Important constraints

- **NUNCA** pegar secrets en chat
- **NUNCA** commitear `.env.production` ni `.env*` (debe estar en `.gitignore`)
- **SIEMPRE** verificar tests y build antes de mergear
- **SIEMPRE** hacer health check post-deploy
- **SIEMPRE** pedir al usuario que confirme antes de mergear a main
- **SIEMPRE** documentar en `memory-bank/sessions/` después de un deploy exitoso
- Si el deploy falla, **NO** hacer rollback sin preguntar — preguntar primero qué quiere hacer

## Outputs esperados

Después de un deploy exitoso, el agente debe:
1. Reportar al usuario el SHA del commit desplegado
2. Confirmar health checks (200 en / y /health, 401 en /api/v1/entries)
3. Listar issues cerrados
4. Mencionar si hubo alguna desviación del plan
5. Preguntar si quiere abrir la skill `qa-senior` para validar el deploy con Playwright

## References

- `scripts/deploy.sh` — script de deploy
- `docker-compose.prod.yml` — config de producción
- `apps/web/Dockerfile` — multi-stage build
- `apps/web/nginx.conf` — SSL + SPA + proxy
- `docs/tasks/google-oauth-cloud-setup.md` — guía específica para Google OAuth
- `docs/tasks/hu-001/002/003` — tareas originales de setup de producción
