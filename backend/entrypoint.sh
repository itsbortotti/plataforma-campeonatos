#!/bin/sh
set -eu

# Allow cron / one-off overrides: dockerCommand becomes args to this entrypoint.
if [ "$#" -gt 0 ]; then
  exec "$@"
fi

# Disco persistente (UPLOAD_DIR, no Render /var/data/uploads) esconde o mkdir da imagem.
# @fastify/static exige player-photos e system no boot.
UPLOAD_ROOT="${UPLOAD_DIR:-./data/uploads}"
mkdir -p "${UPLOAD_ROOT}/player-photos" "${UPLOAD_ROOT}/system"

echo "Running prisma migrate deploy..."
npx prisma migrate deploy

if [ "${SEED_ADMIN:-false}" = "true" ]; then
  echo "Seeding admin..."
  # Senha inválida sai 0 (só log). Qualquer outra falha do seed também não derruba o start.
  if ! npx tsx prisma/seed-admin.ts; then
    echo "Seed do admin falhou. O servidor vai subir mesmo assim." >&2
  fi
fi

exec node dist/index.js
