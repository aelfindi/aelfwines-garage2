#!/bin/bash
set -e
git pull origin main
npm install
npm run build
cd server
npm install
npx prisma migrate deploy
npm run build
pm2 restart garage-api
echo "Deploy complete"
