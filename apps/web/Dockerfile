# ─────────────────────────────────────────────────────────────────────────────
# GlyphLog Web — Dockerfile multi-stage para producción
#
# Stage 1 (build): Compila la app React/Vite con las variables de entorno
#                  de producción (VITE_API_URL, VITE_API_BASE_URL).
# Stage 2 (serve): Imagen mínima con nginx:alpine que sirve los estáticos
#                  y hace proxy_pass a la API.
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copiar archivos de configuración del monorepo para pnpm install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/

# Instalar dependencias respetando el lockfile
RUN pnpm install --frozen-lockfile

# Copiar código del frontend
COPY apps/web ./apps/web

WORKDIR /app/apps/web

# Variables de entorno inyectadas en tiempo de build.
# VITE_* se empaquetan en el bundle de JS — visibles en el navegador.
ARG VITE_API_URL
ARG VITE_API_BASE_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build de producción de Vite → dist/
RUN pnpm build

# ── Stage 2: Serve con nginx ─────────────────────────────────────────────────
FROM nginx:alpine

# Copiar estáticos compilados desde el stage de build
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

# Configuración de nginx (SPA routing, proxy a API, gzip)
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:80/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
