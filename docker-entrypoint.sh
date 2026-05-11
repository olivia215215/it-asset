#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."
i=1
while [ $i -le 30 ]; do
  if echo "SELECT 1;" | npx prisma db execute --stdin 2>/dev/null; then
    echo "PostgreSQL is ready."
    break
  fi
  echo "PostgreSQL not ready yet (attempt $i/30)..."
  sleep 2
  i=$((i + 1))
done

if [ $i -gt 30 ]; then
  echo "ERROR: PostgreSQL did not become ready within 60 seconds."
  exit 1
fi

echo "Pushing database schema..."
npx prisma db push --accept-data-loss

echo "Seeding database..."
npx prisma db seed

exec "$@"
