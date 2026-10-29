import fs from 'node:fs/promises';
import path from 'node:path';
import { put, get, del } from '@vercel/blob';
import { resolveBlobAuthStatus } from '../config.js';

// Vercel Blob (private store). Kredensial dibaca otomatis oleh SDK:
// 1) OIDC: VERCEL_OIDC_TOKEN + BLOB_STORE_ID (default di Vercel / `vercel env pull`)
// 2) Fallback: BLOB_READ_WRITE_TOKEN (di luar Vercel)
// Jangan meneruskan VERCEL_OIDC_TOKEN secara manual agar refresh token tetap otomatis.
const ACCESS = 'private';
const SIGNATURE_PREFIX = 'signatures/';

export const isBlobPathname = value => typeof value === 'string' && value.startsWith(SIGNATURE_PREFIX);

function blobConfigurationError(message) {
  return Object.assign(new Error(message), {
    status: 503,
    code: 'BLOB_CONFIGURATION_ERROR'
  });
}

function assertBlobCredentials() {
  const status = resolveBlobAuthStatus(process.env);
  if (status.configured) return;

  if (status.reason === 'invalid-read-write-token') {
    throw blobConfigurationError('BLOB_READ_WRITE_TOKEN tidak valid. Salin Read-write token dari pengaturan Vercel Blob store, lalu mulai ulang backend.');
  }
  if (status.reason === 'missing-store-id') {
    throw blobConfigurationError('Konfigurasi OIDC Vercel Blob belum lengkap: BLOB_STORE_ID belum tersedia.');
  }
  throw blobConfigurationError('Penyimpanan tanda tangan belum dikonfigurasi. Isi BLOB_READ_WRITE_TOKEN dari Vercel Blob store.');
}

async function runBlobOperation(operation) {
  assertBlobCredentials();
  try {
    return await operation();
  } catch (error) {
    if (/access denied|invalid token|unauthorized/i.test(error?.message || '')) {
      throw blobConfigurationError('Kredensial Vercel Blob ditolak. Pastikan token berasal dari Blob store yang terhubung dan sesuai dengan store tersebut.');
    }
    throw error;
  }
}

export async function putSignature(mentorId, id, buffer) {
  const blob = await runBlobOperation(() => put(`${SIGNATURE_PREFIX}${mentorId}/${id}.png`, buffer, {
    access: ACCESS,
    contentType: 'image/png',
    addRandomSuffix: false,
    allowOverwrite: false
  }));
  return blob.pathname;
}

export async function deleteSignature(pathname) {
  if (isBlobPathname(pathname)) await runBlobOperation(() => del(pathname));
}

/**
 * Mengambil blob privat. Mengembalikan hasil `get()` dari SDK
 * (statusCode 200/304, stream, blob) atau null bila tidak ditemukan.
 */
export function getSignature(pathname, { ifNoneMatch } = {}) {
  return runBlobOperation(() => get(pathname, { access: ACCESS, ...(ifNoneMatch ? { ifNoneMatch } : {}) }));
}

/** Membaca seluruh isi tanda tangan ke Buffer (untuk render PDF). */
export async function readSignatureBuffer(pathname) {
  if (!pathname) return null;
  // Kompatibilitas data lama yang masih tersimpan di filesystem lokal.
  if (!isBlobPathname(pathname)) {
    return fs.readFile(path.resolve(pathname)).catch(() => null);
  }
  const result = await getSignature(pathname);
  if (result?.statusCode !== 200 || !result.stream) return null;
  return Buffer.from(await new Response(result.stream).arrayBuffer());
}
