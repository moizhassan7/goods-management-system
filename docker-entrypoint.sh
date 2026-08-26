#!/bin/sh
set -e

echo "🚀 Starting Goods Management ERP Production Environment..."

# 1. Automatically apply Prisma migrations in production
echo "📦 Running database migrations (prisma migrate deploy)..."
npx prisma migrate deploy || {
  echo "⚠️ Migration deploy warning, trying prisma db push fallback..."
  npx prisma db push --accept-data-loss || true
}

# 2. Check if we need to seed the database
echo "🌱 Ensuring database has initial seed data..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log('⚡ Empty database detected. Running seed script...');
      require('./prisma/seed.js');
    } else {
      console.log('✅ Database already contains data. Skipping full reset.');
    }
  } catch (e) {
    console.log('Running seed to ensure essential tables and users exist...');
    require('./prisma/seed.js');
  } finally {
    await prisma.\$disconnect();
  }
}
check();
" || true

# 3. Start Next.js standalone application
echo "🌐 Starting Next.js Standalone server on port $PORT..."
exec node server.js
