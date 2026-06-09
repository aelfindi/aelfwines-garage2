#!/bin/bash
set -euo pipefail

git pull origin main

# Frontend
npm install
npm run build

# Backend
cd server
npm install
npx prisma generate
# Run migrations only if any exist; otherwise the DB is managed via `prisma db push` (first deploy).
if [ -d "prisma/migrations" ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  npx prisma migrate deploy
else
  echo "No migrations dir -> skipping migrate deploy (schema managed via db push)"
fi
npm run build

# Restart (start if not running)
pm2 restart garage-api --update-env 2>/dev/null || pm2 start dist/index.js --name garage-api --update-env

echo "Deploy complete"
