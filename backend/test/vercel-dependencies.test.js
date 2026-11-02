import test from 'node:test';
import assert from 'node:assert/strict';
import { del, get, put } from '@vercel/blob';
import { parseAuthConfig, parseGlobalConfig } from '@vercel/cli-config';

test('Vercel Blob tetap mengekspor operasi storage setelah override dependency', () => {
  assert.equal(typeof put, 'function');
  assert.equal(typeof get, 'function');
  assert.equal(typeof del, 'function');
});

test('CLI config kompatibel dengan Zod patched untuk schema yang dipakai OIDC', () => {
  const auth = parseAuthConfig({ token: 'test-token', expiresAt: 1_800_000_000_000 });
  assert.equal(auth.token, 'test-token');

  const global = parseGlobalConfig({
    telemetry: { enabled: false },
    guidance: { enabled: true },
    updates: { auto: false }
  });
  assert.equal(global.telemetry.enabled, false);
  assert.equal(global.guidance.enabled, true);
  assert.equal(global.updates.auto, false);
});
