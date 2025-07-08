#!/bin/sh
set -e

echo "Starting WMS application..."

# Run database migrations if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  echo "Running database migrations..."
  npx prisma migrate deploy || echo "Migration failed, but continuing..."
fi

# Execute the main command
exec "$@"