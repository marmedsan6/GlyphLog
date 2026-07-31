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

# ── Cargar variables de entorno de producción ─────────────────────────────────
# docker-compose.prod.yml usa build args como ${VITE_GOOGLE_CLIENT_ID:-} para
# compilar valores en el bundle del frontend en build-time (Vite). Estas vars
# deben estar en el environment del shell cuando se ejecuta `docker compose`,
# no solo en el env_file del contenedor (que solo aplica en runtime).
if [ -f .env.production ]; then
    echo "🔧 Cargando variables de entorno de producción..."
    set -a
    # shellcheck source=/dev/null
    source .env.production
    set +a
else
    echo "❌ No se encontró .env.production"
    echo "Copia .env.production.example a .env.production y rellena los valores."
    exit 1
fi

echo "🔄 Actualizando código..."
git pull origin main

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
docker compose -f docker-compose.prod.yml up -d --build

echo "🗄️ Ejecutando migraciones..."
docker compose -f docker-compose.prod.yml exec -T api alembic upgrade head

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
