# Checklist de seguridad de despliegue

Ejecutar este checklist antes de construir imágenes o ejecutar migraciones. No
imprimir valores de variables, tokens, DSN, cookies ni contenido de ficheros de
entorno.

## 1. Repositorio y secretos

- Confirmar que el working tree está limpio y que la rama de despliegue es la esperada.
- Confirmar que `.env.production`, certificados, claves privadas y configuraciones locales no están trackeados.
- Ejecutar un escaneo especializado si existe (`gitleaks detect --redact --exit-code 1`).
- Si no existe un scanner, usar un fallback portable y bloquear ante coincidencias:

  ```bash
  secret_pattern='(AKIA[0-9A-Z]{16}|ctx7sk-|sk-[A-Za-z0-9_-]{20,}|-----BEGIN .*PRIVATE KEY-----|SECRET_KEY=[^<[:space:]]{32,}|(OPENAI|ANTHROPIC|YOUTUBE)_API_KEY=[^<[:space:]]{12,})'
  git grep -n -I -E "$secret_pattern" -- ':!*.example' ':!docs/**' ':!memory-bank/**' \
    | sed -E 's/(:[0-9]+:).*/\1 <redacted-match>/'
  ```

- Auditar también todas las referencias de `git rev-list --all`; no aceptar el deploy hasta reescribir el historial si aparece una credencial real.
- Verificar que los logs del preflight solo muestran nombres de variables, estados y hashes parciales.

## 2. Entorno de producción

- Exigir `.env.production` no trackeado y permisos `600`.
- Exigir `DEBUG=false` y `ALLOWED_ORIGINS` explícito, sin `*`.
- Rechazar valores que contengan `REPLACE`, `CHANGE_ME`, `EXAMPLE`, `DUMMY`, `your-` o claves de desarrollo conocidas.
- Validar longitud mínima de `SECRET_KEY` sin mostrarla.
- Usar `docker compose --env-file .env.production -f docker-compose.prod.yml config --quiet`.
- Confirmar que PostgreSQL solo recibe `POSTGRES_USER`, `POSTGRES_PASSWORD` y `POSTGRES_DB`.
- Confirmar que ningún secreto se entrega como build arg `VITE_*`; los `VITE_*` son públicos por diseño.

## 3. Red y contenedores

- Confirmar que PostgreSQL no publica puertos al host.
- Confirmar que la API no se expone directamente a Internet y solo recibe tráfico del proxy.
- No usar `--forwarded-allow-ips='*'`; restringirlo al subnet o IP del proxy.
- Ejecutar `nginx -t` dentro de la imagen o contenedor.
- Confirmar certificados montados en solo lectura y que la clave privada no es accesible desde Git.
- Verificar HSTS, CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` y `Permissions-Policy`.

## 4. Post-deploy

- Comprobar que HTTP redirige a HTTPS.
- Comprobar `/health` con `200`.
- Comprobar `/` con `200` y la SPA.
- Comprobar `/api/v1/entries` sin autenticación con `401`.
- Comprobar que `/docs`, `/redoc` y `/openapi.json` no están disponibles.
- Comprobar las cabeceras de seguridad desde el dominio público.
- Revisar logs recientes de API y Nginx buscando trazas, secretos, errores 5xx y fugas de cabeceras.
- Si el dominio no responde, las cabeceras no coinciden o los logs no son limpios, marcar el deploy como fallido.

## 5. Incidente y rollback

- Revocar primero las credenciales comprometidas; limpiar Git no revoca una clave.
- Crear un bundle/backup antes de reescribir historia.
- Reescribir historia solo con confirmación explícita y comunicar que los clones existentes deben reclonarse o rebasearse.
- No ejecutar `git push --force`, rollback, borrado de volumen ni migración inversa sin confirmación del operador.
- Preservar logs y evidencias redacted para el diagnóstico.
