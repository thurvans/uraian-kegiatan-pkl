import dotenv from 'dotenv';
import { z } from 'zod';

// `.env.local` dibuat oleh `vercel env pull` (berisi variabel Vercel OIDC, Blob, & Prisma Postgres).
// Dimuat ke process.env agar kredensial dapat dibaca secara otomatis baik lokal maupun produksi.
dotenv.config({ path: ['.env.local', '.env'], quiet: true });

/**
 * Mendeteksi connection string Prisma Postgres dari Vercel secara otomatis.
 * Saat database dihubungkan di Vercel, Vercel menambahkan prefix nama database ke variabel,
 * misalnya: `uraian_DATABASE_URL`, `uraian_PRISMA_DATABASE_URL`, `uraian_POSTGRES_URL`.
 */
export function resolveDatabaseUrl(env = process.env) {
  // 1. Cek langsung nama variabel standar (tanpa prefix)
  if (env.DATABASE_URL_POOLED?.trim()) return env.DATABASE_URL_POOLED.trim();
  if (env.POSTGRES_PRISMA_URL?.trim()) return env.POSTGRES_PRISMA_URL.trim();
  if (env.DATABASE_URL?.trim()) return env.DATABASE_URL.trim();
  if (env.PRISMA_DATABASE_URL?.trim()) return env.PRISMA_DATABASE_URL.trim();
  if (env.POSTGRES_URL?.trim()) return env.POSTGRES_URL.trim();

  // 2. Deteksi otomatis variabel yang diberi prefix oleh Vercel (seperti uraian_DATABASE_URL)
  const entries = Object.entries(env);

  // Cari connection pooling terlebih dahulu jika ada
  const pooledEntry = entries.find(([key, val]) =>
    typeof val === 'string' && val.trim() && (key.endsWith('_DATABASE_URL_POOLED') || key.endsWith('_POSTGRES_PRISMA_URL'))
  );
  if (pooledEntry) return pooledEntry[1].trim();

  // Cari *_DATABASE_URL (contoh: uraian_DATABASE_URL)
  const directEntry = entries.find(([key, val]) =>
    typeof val === 'string' && val.trim() && key.endsWith('_DATABASE_URL')
  );
  if (directEntry) return directEntry[1].trim();

  // Cari *_PRISMA_DATABASE_URL (contoh: uraian_PRISMA_DATABASE_URL)
  const prismaEntry = entries.find(([key, val]) =>
    typeof val === 'string' && val.trim() && key.endsWith('_PRISMA_DATABASE_URL')
  );
  if (prismaEntry) return prismaEntry[1].trim();

  // Cari *_POSTGRES_URL (contoh: uraian_POSTGRES_URL)
  const postgresEntry = entries.find(([key, val]) =>
    typeof val === 'string' && val.trim() && key.endsWith('_POSTGRES_URL')
  );
  if (postgresEntry) return postgresEntry[1].trim();

  return '';
}

export function resolveDatabaseDirectUrl(env = process.env) {
  if (env.DATABASE_URL_UNPOOLED?.trim()) return env.DATABASE_URL_UNPOOLED.trim();
  if (env.POSTGRES_URL_NON_POOLING?.trim()) return env.POSTGRES_URL_NON_POOLING.trim();
  if (env.DIRECT_URL?.trim()) return env.DIRECT_URL.trim();

  const entries = Object.entries(env);
  const unpooledEntry = entries.find(([key, val]) =>
    typeof val === 'string' && val.trim() && (key.endsWith('_DATABASE_URL_UNPOOLED') || key.endsWith('_POSTGRES_URL_NON_POOLING') || key.endsWith('_DIRECT_URL'))
  );
  if (unpooledEntry) return unpooledEntry[1].trim();

  return resolveDatabaseUrl(env);
}

export function resolveBlobCredentials(env = process.env) {
  let storeId = typeof env.BLOB_STORE_ID === 'string' ? env.BLOB_STORE_ID.trim() : '';
  let token = typeof env.BLOB_READ_WRITE_TOKEN === 'string' ? env.BLOB_READ_WRITE_TOKEN.trim() : '';

  if (!storeId || !token) {
    for (const [key, val] of Object.entries(env)) {
      if (typeof val === 'string' && val.trim()) {
        if (!storeId && key.endsWith('_BLOB_STORE_ID')) storeId = val.trim();
        if (!token && key.endsWith('_BLOB_READ_WRITE_TOKEN')) token = val.trim();
      }
    }
  }

  return { storeId: storeId || undefined, token: token || undefined };
}

export function resolveBlobAuthStatus(env = process.env) {
  const { storeId, token } = resolveBlobCredentials(env);
  const oidcToken = typeof env.VERCEL_OIDC_TOKEN === 'string' ? env.VERCEL_OIDC_TOKEN.trim() : '';

  if (oidcToken && storeId) return { configured: true, mode: 'oidc' };
  if (token?.startsWith('vercel_blob_rw_')) return { configured: true, mode: 'read-write' };
  if (token) return { configured: false, reason: 'invalid-read-write-token' };
  if (oidcToken && !storeId) return { configured: false, reason: 'missing-store-id' };
  return { configured: false, reason: 'missing-credentials' };
}

const autoDatabaseUrl = resolveDatabaseUrl(process.env);
if (autoDatabaseUrl) {
  process.env.DATABASE_URL = autoDatabaseUrl;
}

const blobCreds = resolveBlobCredentials(process.env);
if (!process.env.BLOB_STORE_ID && blobCreds.storeId) {
  process.env.BLOB_STORE_ID = blobCreds.storeId;
}
if (!process.env.BLOB_READ_WRITE_TOKEN && blobCreds.token) {
  process.env.BLOB_READ_WRITE_TOKEN = blobCreds.token;
}

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.preprocess(
    val => (typeof val === 'string' && val.trim() ? val.trim() : resolveDatabaseUrl(process.env)),
    z.string().min(1, 'DATABASE_URL wajib diisi atau dihubungkan melalui integrasi resmi Prisma Postgres di Vercel.')
  ),
  DATABASE_URL_DIRECT: z.preprocess(
    val => (typeof val === 'string' && val.trim() ? val.trim() : resolveDatabaseDirectUrl(process.env)),
    z.string().optional()
  ),
  JWT_ISSUER: z.string().default('pkl-activity'),
  JWT_AUDIENCE: z.string().default('pkl-web'),
  JWT_ACCESS_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  JWT_SIGNING_SECRET: z.string().min(32),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  TRUST_PROXY: z.coerce.number().int().min(0).max(3).default(0),
  REQUEST_BODY_LIMIT: z.string().regex(/^\d+(kb|mb)$/i).default('2mb'),
  COOKIE_SAME_SITE: z.enum(['lax', 'none', 'strict']).default('lax'),
  // Vercel Blob (private store). Dibaca langsung oleh SDK dari process.env.
  BLOB_STORE_ID: z.preprocess(
    v => (typeof v === 'string' && v.trim() ? v.trim() : resolveBlobCredentials(process.env).storeId),
    z.string().optional()
  ),
  BLOB_READ_WRITE_TOKEN: z.preprocess(
    v => (typeof v === 'string' && v.trim() ? v.trim() : resolveBlobCredentials(process.env).token),
    z.string().optional()
  ),
  APP_TIMEZONE: z.string().default('Asia/Jakarta'),
  PDF_EXPORT_MAX_REPORTS: z.coerce.number().int().min(1).max(100).default(30)
}).superRefine((value, context) => {
  if (value.NODE_ENV === 'test') return;
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


const blobAuthStatus = resolveBlobAuthStatus(process.env);
if (parsed.success && parsed.data.NODE_ENV !== 'test' && !blobAuthStatus.configured) {
  const messages = {
    'invalid-read-write-token': 'BLOB_READ_WRITE_TOKEN bukan read-write token Vercel Blob (format yang diharapkan: vercel_blob_rw_...).',
    'missing-store-id': 'VERCEL_OIDC_TOKEN tersedia, tetapi BLOB_STORE_ID belum diisi.',
    'missing-credentials': 'Vercel Blob belum memiliki pasangan kredensial yang dapat digunakan.'
  };
  console.warn(`[config] ${messages[blobAuthStatus.reason]}`);
}

export const config = Object.freeze(parsed.data);
