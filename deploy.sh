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
# If migrations exist use versioned migrate deploy; otherwise sync schema with db push.
if [ -d "prisma/migrations" ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  npx prisma migrate deploy
else
  echo "No migrations dir -> using prisma db push to sync schema"
  npx prisma db push --skip-generate
fi
npm run build

# Restart (start if not running)
pm2 restart garage-api --update-env 2>/dev/null || pm2 start dist/index.js --name garage-api --update-env

echo "Deploy complete"
