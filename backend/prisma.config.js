import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

// Muat .env.local (hasil `vercel env pull`) dan .env lokal
dotenv.config({ path: ['.env.local', '.env'], quiet: true });

// Integrasi Prisma Postgres resmi di Vercel menyuntikkan DATABASE_URL, PRISMA_DATABASE_URL, POSTGRES_URL.
// Untuk keperluan CLI Prisma (misalnya migrasi), utamakan direct connection (unpooled) bila tersedia.
const migrationUrl =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL ||
  process.env.PRISMA_DATABASE_URL ||
  process.env.POSTGRES_URL;

if (!process.env.DATABASE_URL && migrationUrl) {
  process.env.DATABASE_URL = migrationUrl;
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.js'
  }
});
