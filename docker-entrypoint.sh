#!/bin/sh
set -e

# Create S3 bucket before starting Strapi
node /app/scripts/ensure-bucket.mjs

# Start Strapi
exec pnpm run start
