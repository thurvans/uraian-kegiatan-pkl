import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_ISSUER: z.string().default('pkl-activity'),
  JWT_AUDIENCE: z.string().default('pkl-web'),
  JWT_ACCESS_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  JWT_SIGNING_SECRET: z.string().min(32),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  TRUST_PROXY: z.coerce.number().int().min(0).max(3).default(0),
  REQUEST_BODY_LIMIT: z.string().regex(/^\d+(kb|mb)$/i).default('2mb'),
  COOKIE_SAME_SITE: z.enum(['lax', 'none', 'strict']).default('lax'),
  SIGNATURE_STORAGE_DIR: z.string().default('./storage/private/signatures'),
  APP_TIMEZONE: z.string().default('Asia/Jakarta'),
  PDF_EXPORT_MAX_REPORTS: z.coerce.number().int().min(1).max(100).default(30)
}).superRefine((value, context) => {
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
