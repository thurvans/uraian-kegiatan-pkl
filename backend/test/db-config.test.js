import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveDatabaseUrl } from '../src/config.js';

test('resolveDatabaseUrl: mendeteksi alias resmi Prisma Postgres Vercel (PRISMA_DATABASE_URL)', () => {
  const env = {
    PRISMA_DATABASE_URL: 'postgres://prisma_user:pass@db.prisma.io:5432/postgres'
  };
  assert.equal(resolveDatabaseUrl(env), 'postgres://prisma_user:pass@db.prisma.io:5432/postgres');
});

test('resolveDatabaseUrl: mendeteksi alias kompatibilitas Vercel Postgres (POSTGRES_URL)', () => {
  const env = {
    POSTGRES_URL: 'postgres://vercel_user:pass@db.prisma.io:5432/postgres'
  };
  assert.equal(resolveDatabaseUrl(env), 'postgres://vercel_user:pass@db.prisma.io:5432/postgres');
});

test('resolveDatabaseUrl: memprioritaskan DATABASE_URL_POOLED jika tersedia untuk koneksi serverless', () => {
  const env = {
    DATABASE_URL: 'postgres://user:pass@db.prisma.io:5432/postgres',
    DATABASE_URL_POOLED: 'postgres://user:pass@pooled.db.prisma.io:5432/postgres'
  };
  assert.equal(resolveDatabaseUrl(env), 'postgres://user:pass@pooled.db.prisma.io:5432/postgres');
});

test('resolveDatabaseUrl: menggunakan direct DATABASE_URL standar integrasi Vercel', () => {
  const env = {
    DATABASE_URL: 'postgres://direct_user:pass@db.prisma.io:5432/postgres'
  };
  assert.equal(resolveDatabaseUrl(env), 'postgres://direct_user:pass@db.prisma.io:5432/postgres');
});
