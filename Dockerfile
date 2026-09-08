###############
# STAGE 1: BUILD
###############
FROM node:20-alpine AS build

RUN corepack enable && pnpm --version

WORKDIR /app

# Primero manifiestos y Prisma: Docker puede reutilizar la caché
# mientras package.json/pnpm-lock.yaml no cambien.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma

# Instala dependencies + devDependencies.
# Aquí existen Prisma CLI, Nest CLI, TypeScript, Jest, ESLint, etc.
RUN pnpm install --frozen-lockfile

# Código fuente y configuración de Nest.
COPY src ./src
COPY tsconfig.json tsconfig.build.json nest-cli.json ./

# Prisma CLI genera el cliente dentro de node_modules de pnpm.
RUN pnpm prisma generate

# Compila TypeScript -> JavaScript en /app/dist.
RUN pnpm build


####################
# STAGE 2: PRUNE
####################
FROM build AS prune

# Elimina automáticamente todas las devDependencies.
# Se hace después de generar Prisma Client y compilar Nest.
RUN pnpm prune --prod


###############
# STAGE 3: RUNTIME
###############
FROM node:20-alpine AS runtime

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

# Copiamos por primera vez a runtime un node_modules ya podado.
# No copies node_modules desde "build".
COPY --chown=node:node --from=prune /app/node_modules ./node_modules

# Sólo JavaScript compilado y manifiesto del proyecto.
COPY --chown=node:node --from=prune /app/dist ./dist
COPY --chown=node:node --from=prune /app/package.json ./package.json

# La API no se ejecuta como root.
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["node", "dist/main"]