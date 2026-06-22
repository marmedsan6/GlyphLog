#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# GlyphLog API — Entrypoint script
#
# Propósito: Inicializar los directorios con los permisos correctos antes de
#            arrancar la aplicación como usuario no-root.
#
# Problema que resuelve: Docker named volumes se crean con permisos de root.
#   Si la app corre como appuser, no puede escribir en ellos. Este script
#   crea los directorios necesarios como root y luego cede el control a
#   appuser para ejecutar el comando real (uvicorn).
# ─────────────────────────────────────────────────────────────────────────────
set -e

# Crear directorios de uploads con permisos para appuser
mkdir -p /app/uploads/covers
chown -R appuser:appgroup /app/uploads

# Ejecutar el comando como appuser
exec su-exec appuser "$@"
