#!/bin/bash
# Database backup script — run before any schema migration in production.
# Usage: ./scripts/backup-db.sh [output-dir]
#
# Supports PostgreSQL and SQLite.
# For production PostgreSQL, use pg_dump.
# Configure DATABASE_URL env var or pass via .env

set -euo pipefail

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ENV_FILE="${ENV_FILE:-.env}"

# Load environment variables
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

mkdir -p "$BACKUP_DIR"

if [ "${DATABASE_CLIENT:-sqlite}" = "postgres" ]; then
  DB_HOST="${DATABASE_HOST:-localhost}"
  DB_PORT="${DATABASE_PORT:-5432}"
  DB_NAME="${DATABASE_NAME:-strapi}"
  DB_USER="${DATABASE_USERNAME:-vyasta}"
  DB_PASS="${DATABASE_PASSWORD:-vyasta}"
  OUTPUT="${BACKUP_DIR}/strapi_${TIMESTAMP}.sql"

  echo "Backing up PostgreSQL database: ${DB_NAME}@${DB_HOST}:${DB_PORT}"
  PGPASSWORD="$DB_PASS" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-owner \
    --format=custom \
    -f "${OUTPUT}.dump"

  # Also create a readable SQL backup
  PGPASSWORD="$DB_PASS" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-owner \
    -f "$OUTPUT"

  echo "Backup saved: ${OUTPUT}.dump (binary) and ${OUTPUT} (SQL)"
  gzip -f "$OUTPUT"
  echo "Compressed: ${OUTPUT}.gz"

elif [ "${DATABASE_CLIENT:-sqlite}" = "sqlite" ]; then
  DB_FILE="${DATABASE_FILENAME:-.tmp/data.db}"
  OUTPUT="${BACKUP_DIR}/strapi_${TIMESTAMP}.db"

  if [ -f "$DB_FILE" ]; then
    echo "Backing up SQLite database: ${DB_FILE}"
    cp "$DB_FILE" "$OUTPUT"
    echo "Backup saved: ${OUTPUT}"
  else
    echo "Warning: Database file not found: ${DB_FILE}"
  fi
else
  echo "Unknown database client: ${DATABASE_CLIENT}"
  exit 1
fi

echo "Backup completed successfully."
