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
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80/api/v1/entries)
if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "200" ]; then
    echo "✅ API responde (HTTP $HTTP_CODE)"
else
    echo "❌ API no responde correctamente (HTTP $HTTP_CODE)"
    exit 1
fi

echo "✅ Todo listo."
