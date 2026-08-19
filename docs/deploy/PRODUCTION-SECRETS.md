# Secrets de producción

El workflow [`deploy-production.yml`](../../.github/workflows/deploy-production.yml)
usa el entorno protegido `production` de GitHub Actions. Los valores se
transfieren por SSH y se escriben de forma atómica en `.env.production` con
permisos `600`; nunca se imprimen en los logs.

## Configuración obligatoria

Crear estos secrets en el entorno `production`, no en el nivel general del
repositorio:

```text
PROD_SSH_HOST
PROD_SSH_USER
PROD_SSH_PRIVATE_KEY
PROD_SSH_KNOWN_HOSTS
PROD_APP_DIR
PROD_DATABASE_URL
PROD_POSTGRES_USER
PROD_POSTGRES_PASSWORD
PROD_POSTGRES_DB
PROD_SECRET_KEY
PROD_ALLOWED_ORIGINS
PROD_AI_PROVIDER
PROD_AI_COMPLETION_PROVIDER
```

`PROD_SECRET_KEY` debe ser una cadena aleatoria de al menos 32 caracteres.
`PROD_ALLOWED_ORIGINS` debe ser JSON explícito, por ejemplo
`["https://glyphlog.qzz.io"]`; nunca `*`.

## Secrets según funcionalidades

El workflow exige las credenciales del proveedor seleccionado:

```text
PROD_OPENAI_API_KEY
PROD_OPENAI_BASE_URL
PROD_OPENAI_MODEL
PROD_ANTHROPIC_API_KEY
PROD_ANTHROPIC_MODEL
PROD_AWS_ACCESS_KEY_ID
PROD_AWS_SECRET_ACCESS_KEY
PROD_AWS_REGION
PROD_BEDROCK_REGION
PROD_BEDROCK_MODEL_ID
```

Las integraciones opcionales usan:

```text
PROD_GOOGLE_CLIENT_ID
PROD_VITE_GOOGLE_CLIENT_ID
PROD_IGDB_CLIENT_ID
PROD_IGDB_CLIENT_SECRET
PROD_YOUTUBE_API_KEY
```

No subir placeholders ni claves directamente en el chat. Para guardar un valor
desde el terminal sin mostrarlo:

```bash
printf '%s' "$NUEVO_VALOR" | bash scripts/gh.sh secret set NOMBRE --env production -R marmedsan6/GlyphLog
```

## SSH confiable

`PROD_SSH_KNOWN_HOSTS` debe contener la salida verificada de `ssh-keyscan` para
el servidor. No se usa `StrictHostKeyChecking=no` ni se acepta TOFU durante el
despliegue.

Configurar también revisores obligatorios para el entorno `production` en
GitHub antes de permitir despliegues manuales.
