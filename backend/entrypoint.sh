#!/bin/sh
set -eu

# Allow cron / one-off overrides: dockerCommand becomes args to this entrypoint.
if [ "$#" -gt 0 ]; then
  exec "$@"
fi

echo "Running prisma migrate deploy..."
npx prisma migrate deploy

if [ "${SEED_ADMIN:-false}" = "true" ]; then
  echo "Seeding admin..."
  npx tsx prisma/seed-admin.ts
fi

exec node dist/index.js
