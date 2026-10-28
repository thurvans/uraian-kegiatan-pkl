import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

// Muat .env.local (hasil `vercel env pull`) dan .env lokal
dotenv.config({ path: ['.env.local', '.env'], quiet: true });

function findDatabaseUrl() {
  const env = process.env;
  if (env.DATABASE_URL_UNPOOLED?.trim()) return env.DATABASE_URL_UNPOOLED.trim();
  if (env.POSTGRES_URL_NON_POOLING?.trim()) return env.POSTGRES_URL_NON_POOLING.trim();
  if (env.DATABASE_URL?.trim()) return env.DATABASE_URL.trim();
  if (env.PRISMA_DATABASE_URL?.trim()) return env.PRISMA_DATABASE_URL.trim();
  if (env.POSTGRES_URL?.trim()) return env.POSTGRES_URL.trim();

  const entries = Object.entries(env);
  const unpooled = entries.find(([k, v]) => typeof v === 'string' && v.trim() && (k.endsWith('_DATABASE_URL_UNPOOLED') || k.endsWith('_POSTGRES_URL_NON_POOLING')));
  if (unpooled) return unpooled[1].trim();

  const direct = entries.find(([k, v]) => typeof v === 'string' && v.trim() && (k.endsWith('_DATABASE_URL') || k.endsWith('_PRISMA_DATABASE_URL') || k.endsWith('_POSTGRES_URL')));
  if (direct) return direct[1].trim();

  return '';
}

const migrationUrl = findDatabaseUrl();
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
