import { PrismaClient } from '@prisma/client';
import { config } from '../config.js';

const globalForPrisma = globalThis;

function createPrismaClient() {
  return new PrismaClient({
    datasources: {
      db: {
        url: config.DATABASE_URL
      }
    },
    log: config.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
  });
}

export const prisma = globalForPrisma.__pklPrisma || createPrismaClient();

if (config.NODE_ENV !== 'production') {
  globalForPrisma.__pklPrisma = prisma;
}
