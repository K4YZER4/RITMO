###############
# STAGE 1: BUILD
###############
FROM node:24-alpine AS build

RUN corepack enable && pnpm --version

WORKDIR /app

# Primero manifiestos y esquemas de Prisma para aprovechar caché de capas Docker
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma.config.ts ./
COPY prisma ./prisma

# Instalación de dependencias completas para compilación
RUN pnpm install --frozen-lockfile

# Código fuente y configs TypeScript
COPY src ./src
COPY tsconfig.json tsconfig.build.json nest-cli.json ./

# Generar cliente Prisma con adaptador
ARG DATABASE_URL="postgresql://ritmo:ritmo@localhost:5432/ritmo"
ENV DATABASE_URL=$DATABASE_URL
RUN pnpm prisma generate

# Compilar API NestJS y script de seed precompilado
RUN pnpm build


####################
# STAGE 2: PRUNE
####################
FROM build AS prune

# Podar devDependencies conservando Prisma CLI y dependencias de producción
RUN pnpm prune --prod


###############
# STAGE 3: RUNTIME (PostgreSQL Efímero + NestJS)
###############
FROM node:24-alpine AS runtime

# Instalar PostgreSQL 16 y su-exec para aislamiento de procesos
RUN apk add --no-cache postgresql16 postgresql16-contrib su-exec curl

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL="postgresql://ritmo:ritmo@127.0.0.1:5432/ritmo"
ENV DIRECT_URL="postgresql://ritmo:ritmo@127.0.0.1:5432/ritmo"

WORKDIR /app

# Copiar artefactos podados de producción asignados al usuario no-root node
COPY --chown=node:node --from=prune /app/node_modules ./node_modules
COPY --chown=node:node --from=prune /app/dist ./dist
COPY --chown=node:node --from=prune /app/package.json ./package.json
COPY --chown=node:node --from=prune /app/prisma ./prisma
COPY --chown=node:node --from=prune /app/prisma.config.ts ./prisma.config.ts

# Copiar script de arranque orquestador
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=35s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

ENTRYPOINT ["/entrypoint.sh"]
