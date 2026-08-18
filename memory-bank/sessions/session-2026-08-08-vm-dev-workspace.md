# Session 2026-08-08 — Dev workspace 24/7 en Oracle Cloud + acceso desde móvil

## Contexto
El usuario quiere trabajar en GlyphLog desde su Samsung S25 Ultra (estilo DHH: terminal + agentes). Para no depender del PC encendido, se montó un workspace dev en la VM de producción de Oracle Cloud, aislado de prod.

## Qué se hizo

### 1. `docker-compose.dev.yml` (repo, sin commitear aún)
Variante de desarrollo aislada de prod:
- Contenedores con nombres `glyphlog-dev-*` (postgres, api, web)
- **Todos los puertos bindeados a 127.0.0.1** (5433 postgres, 8000 api, 5173 vite) — no se expone nada a internet
- SECRET_KEY generada fresca en `apps/api/.env` (openssl rand -hex 32), NO la de prod
- Postgres dev en 127.0.0.1:5433 con volumen propio `glyphlog-dev_postgres_dev_data`

### 2. Incidente: proyecto compose compartido (lección importante)
- `docker compose ls` reveló el proyecto `glyphlog` fusionando `~/dev/glyphlog/docker-compose.dev.yml` + `/opt/glyphlog/docker-compose.prod.yml`.
- Causa: Compose identifica el proyecto por el nombre de la carpeta (ambas se llaman `glyphlog`) y reutiliza los config files grabados en los labels de los contenedores.
- Consecuencia: el `up` del dev **eliminó los contenedores de prod** (postgres-prod, api-prod). El volumen `glyphlog_postgres_data` quedó intacto.
- Fix: `cd /opt/glyphlog && docker compose -f docker-compose.prod.yml up -d` → prod restaurado (200 en /health, 401 en /api/v1/entries/).
- Prevención: `COMPOSE_PROJECT_NAME=glyphlog-dev` en el `.env` del workspace dev. **Regla: tras cualquier `up` en esa VM, comprobar `docker compose ls`.**

### 3. Prerrequisitos instalados en la VM
- Node 22 (NodeSource) — antes había Node 12 que bloqueaba (hubo que `apt remove libnode-dev` por conflicto de archivos)
- pnpm 9 (corepack)
- uv 0.12.3
- Docker ya estaba

### 4. Estado final de la VM (verificado)
```
NAME         STATUS       CONFIG FILES
glyphlog     running(3)   /opt/glyphlog/docker-compose.prod.yml   ← solo prod
glyphlog-dev running(3)   ~/dev/glyphlog/docker-compose.dev.yml   ← solo dev
```
- Dev: api 8000 /health 200, vite 5173 200, alembic upgrade head OK
- Prod: https://glyphlog.qzz.io/health 200, /api/v1/entries/ 401

### 5. GitHub
- La VM ya tenía clave SSH `~/.ssh/id_ed25519` (`marmedsan6@alum.us.es`) pero NO está registrada en GitHub → `git push` desde la VM da Permission denied (publickey). **Pendiente de usuario**: añadir `~/.ssh/id_ed25519.pub` en GitHub → Settings → SSH and GPG keys.
- El remote del workspace dev ya apunta a `git@github.com:marmedsan6/GlyphLog.git`.

## Pendiente
- [ ] Usuario: añadir la pubkey de la VM en GitHub
- [ ] Usuario: probar conexión desde el móvil (Termius/Termux) + túnel SSH para ver el frontend dev
- [ ] Commitear `docker-compose.dev.yml` (opcional, recomendado)
- [ ] Limpiar contenedores fantasma de otros proyectos (`frontend-bubblewrap-1` Exited de ~/proclub) — NO tocar `hytale-server` (servidor personal del usuario)

## Notas
- El `.env` local del repo (raíz) se copió a la VM con el rsync (gitignored, contiene VITE_GOOGLE_CLIENT_ID público) — inofensivo.
- No se abrió ningún puerto en OCI: el acceso dev es solo por túnel SSH. Para mosh habría que abrir UDP 60000-60010.
- Los MCPs (Postgres MCP) pueden apuntar a 127.0.0.1:5433 glyphlog/glyphlog para la BD dev.
