import dotenv from 'dotenv';
import { z } from 'zod';

// `.env.local` dibuat oleh `vercel env pull` (berisi variabel Vercel OIDC, Blob, & Prisma Postgres).
// Dimuat ke process.env agar kredensial dapat dibaca secara otomatis baik lokal maupun produksi.
dotenv.config({ path: ['.env.local', '.env'], quiet: true });

/**
 * Mendeteksi connection string Prisma Postgres resmi dari Vercel.
 * Integrasi resmi Prisma Postgres di Vercel Marketplace menyuntikkan:
 * - `DATABASE_URL`: connection string direct ke database Prisma Postgres.
 * - `PRISMA_DATABASE_URL`: alias resmi yang bernilai identik dengan DATABASE_URL.
 * - `POSTGRES_URL`: alias standar kompatibilitas Vercel Postgres.
 * - `DATABASE_URL_POOLED` / `POSTGRES_PRISMA_URL`: connection string pooled untuk query traffic tinggi di serverless.
 */
export function resolveDatabaseUrl(env = process.env) {
  return (
    env.DATABASE_URL_POOLED ||
    env.POSTGRES_PRISMA_URL ||
    env.DATABASE_URL ||
    env.PRISMA_DATABASE_URL ||
    env.POSTGRES_URL ||
    ''
  );
}

const autoDatabaseUrl = resolveDatabaseUrl(process.env);
if (!process.env.DATABASE_URL && autoDatabaseUrl) {
  process.env.DATABASE_URL = autoDatabaseUrl;
}

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.preprocess(
    val => process.env.DATABASE_URL_POOLED || (typeof val === 'string' && val.trim() ? val.trim() : resolveDatabaseUrl()),
    z.string().min(1, 'DATABASE_URL wajib diisi atau dihubungkan melalui integrasi resmi Prisma Postgres di Vercel.')
  ),
  DATABASE_URL_DIRECT: z.preprocess(
    val => val || process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || undefined,
    z.string().optional()
  ),
  JWT_ISSUER: z.string().default('pkl-activity'),
  JWT_AUDIENCE: z.string().default('pkl-web'),
  JWT_ACCESS_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  JWT_SIGNING_SECRET: z.string().min(32),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  TRUST_PROXY: z.coerce.number().int().min(0).max(3).default(0),
  REQUEST_BODY_LIMIT: z.string().regex(/^\d+(kb|mb)$/i).default('2mb'),
  COOKIE_SAME_SITE: z.enum(['lax', 'none', 'strict']).default('lax'),
  // Vercel Blob (private store). Dibaca langsung oleh SDK dari process.env.
  BLOB_STORE_ID: z.preprocess(v => v || undefined, z.string().optional()),
  BLOB_READ_WRITE_TOKEN: z.preprocess(v => v || undefined, z.string().optional()),
  APP_TIMEZONE: z.string().default('Asia/Jakarta'),
  PDF_EXPORT_MAX_REPORTS: z.coerce.number().int().min(1).max(100).default(30)
}).superRefine((value, context) => {
  if (value.NODE_ENV === 'test') return;
  if (!value.DATABASE_URL) {
    context.addIssue({
      code: 'custom',
      path: ['DATABASE_URL'],
      message: 'Koneksi database belum tersedia. Hubungkan Prisma Postgres di tab Storage/Marketplace Vercel.'
    });
  }
  if (!value.BLOB_STORE_ID && !value.BLOB_READ_WRITE_TOKEN) {
    if (value.NODE_ENV === 'production') {
      context.addIssue({ code: 'custom', path: ['BLOB_STORE_ID'], message: 'Hubungkan Vercel Blob store (BLOB_STORE_ID) atau isi BLOB_READ_WRITE_TOKEN.' });
    } else {
      console.warn('[config] Vercel Blob belum dikonfigurasi. Jalankan `vercel env pull` atau isi BLOB_READ_WRITE_TOKEN.');
    }
  }
  if (value.NODE_ENV !== 'production') return;
  if (!value.FRONTEND_URL.startsWith('https://')) {
    context.addIssue({ code: 'custom', path: ['FRONTEND_URL'], message: 'Production wajib menggunakan URL HTTPS.' });
  }
  if (/replace-with|change-me|password/i.test(value.JWT_SIGNING_SECRET)) {
    context.addIssue({ code: 'custom', path: ['JWT_SIGNING_SECRET'], message: 'Production wajib menggunakan JWT secret acak.' });
  }
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const fields = parsed.error.issues.map(issue => issue.path.join('.') || 'environment').join(', ');
  throw new Error(`Konfigurasi environment tidak valid: ${fields}`);
}

export const config = Object.freeze(parsed.data);
