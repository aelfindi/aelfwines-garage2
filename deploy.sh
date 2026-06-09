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
npx prisma migrate deploy
npm run build

# Restart (start if not running)
pm2 restart garage-api --update-env 2>/dev/null || pm2 start dist/index.js --name garage-api --update-env

echo "Deploy complete"
