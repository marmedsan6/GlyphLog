FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copiar archivos de configuración del monorepo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Copiar package.json de todos los paquetes para que pnpm resuelva el lockfile correctamente
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/

# Instalar dependencias del monorepo completo
RUN pnpm install --frozen-lockfile

# Copiar código del frontend
COPY apps/web ./apps/web

WORKDIR /app/apps/web

EXPOSE 5173

# Correr en desarrollo con --host para poder ser accedido desde fuera del contenedor
CMD ["pnpm", "dev", "--host", "0.0.0.0"]
