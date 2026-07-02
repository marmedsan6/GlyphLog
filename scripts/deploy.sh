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
