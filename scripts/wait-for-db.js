#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

async function waitForDatabase(maxAttempts = 30, delayMs = 1000) {
  const prisma = new PrismaClient();
  
  console.log('Waiting for database to be ready...');
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('Database is ready!');
      await prisma.$disconnect();
      return true;
    } catch (error) {
      console.log(`Database connection attempt ${attempt}/${maxAttempts} failed`);
      if (attempt === maxAttempts) {
        console.error('Database failed to become ready');
        await prisma.$disconnect();
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

// Only run if this is the main module
if (require.main === module) {
  waitForDatabase().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { waitForDatabase };