#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# GlyphLog — Script de despliegue en producción
#
# Requisitos:
#   - Docker y Docker Compose instalados
#   - Archivo .env.production configurado con todas las variables
#   - Acceso al repositorio git (para git pull)
#
# Uso:
#   bash scripts/deploy.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Preflight de seguridad y configuración ────────────────────────────────────
# No hacer `source` del fichero: además de exponer todos los secretos a los
# procesos hijos, eso evalúa contenido controlado por el fichero como shell.
if [ -f .env.production ]; then
    echo "🔐 Validando configuración de producción..."
    if git ls-files --error-unmatch .env.production >/dev/null 2>&1; then
        echo "❌ .env.production está versionado"
        exit 1
    fi

    ENV_MODE=$(stat -c '%a' .env.production)
    if [ "$ENV_MODE" != "600" ]; then
        echo "❌ .env.production debe tener permisos 600 (actual: $ENV_MODE)"
        exit 1
    fi

    if ! grep -Eq '^DEBUG=false[[:space:]]*$' .env.production; then
        echo "❌ DEBUG debe ser false en producción"
        exit 1
    fi

    if ! grep -Eq '^ALLOWED_ORIGINS=.+$' .env.production || grep -Eq '^ALLOWED_ORIGINS=.*\*' .env.production; then
        echo "❌ ALLOWED_ORIGINS debe existir y no puede contener *"
        exit 1
    fi

    SECRET_KEY_LENGTH=$(awk -F= '$1 == "SECRET_KEY" { print length($2) }' .env.production)
    if [ "${SECRET_KEY_LENGTH:-0}" -lt 32 ] || grep -Eqi '^SECRET_KEY=.*(replace|change|example|dummy|your-|super-secret)' .env.production; then
        echo "❌ SECRET_KEY ausente, débil o de ejemplo"
        exit 1
    fi

    if grep -Eqi '^(POSTGRES_PASSWORD|DATABASE_URL)=.*(replace|change|example|dummy|password)' .env.production; then
        echo "❌ Credenciales de base de datos de ejemplo detectadas"
        exit 1
    fi
else
    echo "❌ No se encontró .env.production"
    echo "Copia .env.production.example a .env.production y rellena los valores."
    exit 1
fi

COMPOSE=(docker compose --env-file .env.production -f docker-compose.prod.yml)

echo "🔄 Actualizando código..."
git pull --ff-only origin main

echo "🧪 Validando configuración Docker..."
"${COMPOSE[@]}" config --quiet

echo "📦 Actualizando extensión Chrome..."
# Requiere Node.js y pnpm instalados en el servidor. Si no están disponibles,
# se omite este paso (el zip anterior queda tal cual en public/extension/).
if command -v pnpm &> /dev/null; then
    cd apps/extension
    pnpm install --frozen-lockfile --ignore-scripts
    pnpm build
    cd ../..
    mkdir -p apps/web/public/extension
    # Empaqueta solo el contenido de chrome-mv3 (sin el directorio padre)
    # Creamos en /tmp para evitar sobreescribir el zip activo con zip -r (que añade en vez de reemplazar)
    cd apps/extension/.output/chrome-mv3
    zip -r /tmp/glyphlog-companion.zip . -x '*.map'
    cp /tmp/glyphlog-companion.zip ../../../../apps/web/public/extension/glyphlog-companion.zip
    rm /tmp/glyphlog-companion.zip
    cd ../../../..
    echo "✅ Extension zip actualizado"
else
    echo "⚠️  pnpm no encontrado — se mantiene el zip previo de la extensión"
fi

echo "🐳 Reconstruyendo y levantando contenedores de producción..."
"${COMPOSE[@]}" up -d --build

echo "🗄️ Ejecutando migraciones..."
"${COMPOSE[@]}" exec -T api alembic upgrade head

echo "✅ Despliegue completado. Verificando salud..."
sleep 3

echo "→ Nginx..."
curl -s http://localhost:80/health && echo ""

echo "→ API..."
# /api/v1/entries sin auth devuelve 401, pero confirma que la API está viva
# Usamos -k (insecure) porque localmente el certificado SSL puede no coincidir, y -L (follow redirect)
# porque Nginx redirige HTTP a HTTPS (301) y FastAPI redirige /api/v1/entries a /api/v1/entries/ (307)
HTTP_CODE=$(curl -k -s -L -o /dev/null -w "%{http_code}" https://localhost/api/v1/entries)
if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "200" ]; then
    echo "✅ API responde (HTTP $HTTP_CODE)"
else
    echo "❌ API no responde correctamente (HTTP $HTTP_CODE)"
    exit 1
fi

echo "✅ Todo listo."
