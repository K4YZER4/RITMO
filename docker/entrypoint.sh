#!/bin/sh
set -e

echo "🚀 [RITMO Demo] Inicializando entorno efímero..."

PGDATA="/var/lib/postgresql/data"
export PGHOST=127.0.0.1
export PGPORT=5432
export PGUSER=postgres

mkdir -p "$PGDATA" /run/postgresql
chown -R postgres:postgres /var/lib/postgresql /run/postgresql
chmod 0700 "$PGDATA"

# Si el cluster no existe, lo inicializamos
if [ ! -f "$PGDATA/PG_VERSION" ]; then
  echo "📦 [PostgreSQL] Creando nuevo cluster efímero..."
  su-exec postgres initdb -D "$PGDATA" --auth-local=trust --auth-host=trust -E UTF8 > /dev/null

  # Optimización de PostgreSQL para bajo consumo en Render Free (512MB RAM)
  cat << 'EOF' >> "$PGDATA/postgresql.conf"
listen_addresses = '127.0.0.1'
port = 5432
max_connections = 25
shared_buffers = 16MB
effective_cache_size = 64MB
maintenance_work_mem = 8MB
checkpoint_completion_target = 0.9
wal_buffers = 1MB
default_statistics_target = 50
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 2MB
min_wal_size = 80MB
max_wal_size = 250MB
EOF

  echo "host all all 127.0.0.1/32 trust" > "$PGDATA/pg_hba.conf"
  echo "local all all trust" >> "$PGDATA/pg_hba.conf"
fi

echo "⚡ [PostgreSQL] Arrancando demonio PostgreSQL..."
su-exec postgres pg_ctl -D "$PGDATA" -w start

echo "👤 [PostgreSQL] Configurando usuario y base de datos..."
su-exec postgres psql -h 127.0.0.1 -tc "SELECT 1 FROM pg_user WHERE usename = 'ritmo'" | grep -q 1 || \
  su-exec postgres psql -h 127.0.0.1 -c "CREATE USER ritmo WITH PASSWORD 'ritmo' SUPERUSER;"

su-exec postgres psql -h 127.0.0.1 -tc "SELECT 1 FROM pg_database WHERE datname = 'ritmo'" | grep -q 1 || \
  su-exec postgres psql -h 127.0.0.1 -c "CREATE DATABASE ritmo OWNER ritmo;"

# Configuramos variables para Prisma y la API
export DATABASE_URL="${DATABASE_URL:-postgresql://ritmo:ritmo@127.0.0.1:5432/ritmo}"
export DIRECT_URL="${DIRECT_URL:-postgresql://ritmo:ritmo@127.0.0.1:5432/ritmo}"

echo "🔄 [Prisma] Aplicando migraciones de base de datos..."
su-exec node ./node_modules/.bin/prisma migrate deploy

echo "🌱 [Seed] Sembrando datos de demostración limpios..."
su-exec node node dist/prisma-seed/seed-demo.js || echo "⚠️ Seed completado o datos ya inicializados"

echo "✨ [RITMO Demo] Listo. Arrancando API NestJS como usuario no-root (node) en puerto ${PORT:-3000}..."
exec su-exec node node dist/main
