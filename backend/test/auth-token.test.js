import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccessToken, verifyAccessToken } from '../src/lib/auth.js';

test('access token ditandatangani dengan identitas refresh session', async () => {
  const token = await createAccessToken({ id: 'user-1', role: 'MAGANG' }, 'session-1');
  const payload = await verifyAccessToken(token);

  assert.equal(payload.sub, 'user-1');
  assert.equal(payload.role, 'MAGANG');
  assert.equal(payload.sid, 'session-1');
});

test('access token tidak dapat dibuat tanpa identitas session', async () => {
  await assert.rejects(
    createAccessToken({ id: 'user-1', role: 'MAGANG' }),
    /Session ID diperlukan/
  );
});
