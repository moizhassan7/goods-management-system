#!/bin/sh
set -e

echo "Starting Goods Management ERP..."

echo "Running database migrations (prisma migrate deploy)..."
npx prisma migrate deploy

echo "Ensuring database has initial seed data..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log('Empty database detected. Running seed script...');
      require('./prisma/seed.js');
    } else {
      console.log('Database already contains data. Skipping seed.');
    }
  } catch (e) {
    console.error('Seed check failed:', e && e.message ? e.message : e);
    process.exit(1);
  } finally {
    await prisma.\$disconnect();
  }
}
check();
"

echo "Starting Next.js standalone server on port \$PORT..."
exec node server.js
