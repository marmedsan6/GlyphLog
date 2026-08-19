---
name: deploy-to-prod
description: Use when deploying GlyphLog changes to production, promoting a branch, merging and deploying, or running a production release. Enforces secret scanning, environment validation, Docker/Nginx hardening, safe Git coordination, smoke tests, and fail-closed post-deploy verification for Oracle Cloud + Cloudflare + Docker + nginx + qzz.io domain.
---

# Deploy to Production — GlyphLog

Ejecutar el despliegue como una operación fail-closed. No declarar éxito si
faltan rotaciones, checks de seguridad, conectividad pública o evidencias de
salud. Leer también [references/security-checklist.md](references/security-checklist.md).

## Contexto de producción

- Dominio: \`https://glyphlog.qzz.io\` detrás de Cloudflare Tunnel y una VM Oracle Cloud.
- Stack: Docker Compose, FastAPI, PostgreSQL 15, nginx y build estático de Vite.
- Compose: \`docker-compose.prod.yml\`.
- Script: \`scripts/deploy.sh\`.
- Entorno: \`.env.production\` en el servidor, nunca versionado.
- Certificados: \`./certs\` montado en nginx, nunca versionado.

## Phase 0: regla de seguridad

Antes de desplegar:

1. No pegar secretos, \`.env.production\`, certificados, cookies ni logs completos en el chat.
2. No ejecutar \`source .env.production\`; usar \`docker compose --env-file\`.
3. No considerar secreta ninguna variable \`VITE_*\`: termina en el bundle del navegador.
4. Bloquear si se detecta una credencial literal en el working tree o en cualquier commit.
5. Rotar/revocar la credencial comprometida antes de limpiar Git; limpiar historial no revoca claves.
6. No ejecutar \`git push --force\`, rollback, borrado de volumen o migración inversa sin confirmación explícita del operador.

## Phase 1: preflight local

Verificar el estado antes de mergear:

\`\`\`bash
git branch --show-current
git status --short
git fetch origin
git diff --check
\`\`\`

Exigir working tree limpio, rama identificada, ausencia de cambios remotos no
coordinados y una revisión de la rama base. Usar siempre \`bash scripts/gh.sh\`
para operaciones GitHub; no ejecutar \`gh\` directamente.

Ejecutar lint, typecheck, tests y build según las dependencias reales del
monorepo. Si los tests de API requieren PostgreSQL, levantar una base de test
aislada o detenerse y reportar la dependencia faltante. No sustituir la base
de test por la base productiva.

## Phase 2: preflight de secretos

Ejecutar el checklist completo de [security-checklist.md](references/security-checklist.md).

- Usar \`gitleaks\`/scanner equivalente si está instalado y \`--redact\`.
- Si no existe scanner especializado, usar \`git grep\` y recorrer \`git rev-list --all\`.
- Bloquear ante cualquier patrón de API key, token, clave privada, password real o \`SECRET_KEY\` no placeholder en archivos de ejemplo.
- Redactar la salida antes de mostrarla; imprimir solo ruta, línea y \`<redacted-match>\`.
- Auditar especialmente \`.mcp.json\`, \`opencode.json\`, \`.env*\`, \`*.pem\`, \`*.key\`, \`certs/\` y logs.

Si se encuentra un secreto publicado:

1. Detener el deploy.
2. Identificar el proveedor y solicitar/ejecutar su revocación con autorización.
3. Crear un backup/bundle local antes de reescribir historia.
4. Reemplazar el secreto por una referencia de entorno o placeholder.
5. Crear una historia limpia con \`git filter-repo\` (preferido). Si no está
   disponible, usar \`git filter-branch\` solo como fallback explícito, eliminar
   las referencias \`refs/original/*\` generadas y verificar de nuevo todos los
   refs antes del force-push.
6. Coordinar el force-push con \`--force-with-lease\` y comunicar que los clones
   existentes deben reclonarse o rebasearse.

## Phase 3: entorno y configuración

En el servidor, validar sin imprimir valores:

\`\`\`bash
test -f .env.production
test "$(stat -c '%a' .env.production)" = 600
git ls-files --error-unmatch .env.production >/dev/null 2>&1 && exit 1 || true
grep -Eq '^DEBUG=false[[:space:]]*$' .env.production
grep -Eq '^ALLOWED_ORIGINS=.+$' .env.production
grep -Eq '^ALLOWED_ORIGINS=.*\*' .env.production && exit 1 || true
\`\`\`

Comprobar que \`SECRET_KEY\` tiene al menos 32 caracteres y que ningún secreto
contiene \`REPLACE\`, \`CHANGE_ME\`, \`EXAMPLE\`, \`DUMMY\`, \`your-\` o valores de desarrollo. No mostrar el valor ni su longitud junto con otros datos identificables.

Usar exclusivamente:

\`\`\`bash
docker compose --env-file .env.production -f docker-compose.prod.yml config --quiet
\`\`\`

Confirmar que PostgreSQL recibe solo sus tres variables de base de datos, que
nginx no recibe secretos como build args y que el API no publica un puerto
directamente a Internet. Rechazar \`--forwarded-allow-ips='*'\`; usar el subnet o
IP fija del proxy confiable.

## Phase 4: merge seguro

Para una rama feature:

\`\`\`bash
git push -u origin feature/<nombre>
git checkout main
git pull --ff-only origin main
git merge --no-ff feature/<nombre> -m "Merge: <descripción corta>"
git push origin main
\`\`\`

Pedir confirmación antes de mergear directamente a \`main\` cuando el usuario
no lo haya solicitado expresamente. Si el historial debe limpiarse, usar un
backup y \`git push --force-with-lease\` solo después de confirmar el nuevo SHA y
la coordinación con los colaboradores.

## Phase 5: deploy

Usar el script versionado desde el servidor:

\`\`\`bash
ssh usuario@servidor "cd ~/GlyphLog && bash scripts/deploy.sh"
\`\`\`

El script debe:

1. Validar permisos, placeholders, \`DEBUG\`, CORS y que \`.env.production\` no está trackeado.
2. Ejecutar \`git pull --ff-only origin main\`.
3. Ejecutar \`docker compose --env-file .env.production -f docker-compose.prod.yml config --quiet\`.
4. Construir imágenes sin imprimir argumentos ni variables.
5. Ejecutar migraciones forward (\`alembic upgrade head\`) sin rollback automático.
6. Verificar nginx, API y health checks.

Si cambian variables públicas \`VITE_*\`, reconstruir la imagen web. Nunca pasar
claves privadas como \`VITE_*\` ni build args.

## Phase 6: hardening y verificación pública

Verificar desde el dominio público y desde el servidor:

\`\`\`bash
curl -sS -I http://glyphlog.qzz.io/
curl -sS -I https://glyphlog.qzz.io/health
curl -sS -I https://glyphlog.qzz.io/
curl -sS -I https://glyphlog.qzz.io/api/v1/entries
curl -sS -I https://glyphlog.qzz.io/docs
curl -sS -I https://glyphlog.qzz.io/redoc
curl -sS -I https://glyphlog.qzz.io/openapi.json
\`\`\`

Aceptar solo:

- HTTP redirige a HTTPS.
- \`/health\` devuelve \`200\`.
- \`/\` devuelve la SPA con \`200\`.
- \`/api/v1/entries\` sin autenticación devuelve \`401\`.
- \`/docs\`, \`/redoc\` y \`/openapi.json\` no están expuestos en producción.
- HTTPS incluye HSTS, CSP, \`X-Content-Type-Options\`, \`X-Frame-Options\`, \`Referrer-Policy\` y \`Permissions-Policy\`.

Ejecutar \`nginx -t\` y revisar los últimos logs de API/nginx buscando errores
5xx, tracebacks, tokens, DSN, cabeceras sensibles o valores de entorno. Si el
dominio no responde, las cabeceras faltan o los logs no son limpios, marcar el
deploy como fallido.

## Phase 7: rollback y cierre

Ante un fallo, conservar evidencias redactadas y detenerse. No borrar volúmenes
ni hacer rollback automático. Preguntar antes de elegir entre:

- volver al commit anterior y reconstruir imágenes;
- corregir configuración y repetir el deploy;
- revertir una migración con un procedimiento específico.

Después de un deploy exitoso:

1. Reportar SHA desplegado y resultado de cada smoke test.
2. Indicar cualquier check omitido o degradado.
3. Cerrar issues únicamente con \`bash scripts/gh.sh\` y autorización del usuario.
4. Documentar el resultado en \`memory-bank/sessions/\` solo si el usuario solicita mantener ese registro.
5. No eliminar ramas ni secretos antiguos sin confirmar que la rotación fue efectiva.
