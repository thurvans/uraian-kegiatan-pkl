import test from 'node:test';
import assert from 'node:assert/strict';
import { hashToken } from '../src/lib/auth.js';
import { createRefreshSession, rotateRefreshSession } from '../src/services/refresh-session.js';

function clientFor(session, { updateCount = 1 } = {}) {
  const created = [];
  const tx = {
    refreshSession: {
      findUnique: async ({ where }) => where.tokenHash === hashToken('current-token') ? session : null,
      updateMany: async () => ({ count: updateCount }),
      create: async ({ data }) => {
        const record = { id: `new-session-${created.length + 1}`, ...data };
        created.push(record);
        return record;
      }
    }
  };
  return {
    created,
    $transaction: async callback => callback(tx)
  };
}

const now = new Date('2026-11-02T00:00:00.000Z');
const activeSession = {
  id: 'session-1',
  userId: 'user-1',
  revokedAt: null,
  expiresAt: new Date('2026-12-01T00:00:00.000Z'),
  user: { id: 'user-1', isActive: true, role: 'MAGANG' }
};

test('session baru mengembalikan token dan ID record yang saling terikat', async () => {
  let stored;
  const client = {
    refreshSession: {
      create: async ({ data }) => {
        stored = { id: 'session-created', ...data };
        return stored;
      }
    }
  };

  const result = await createRefreshSession(client, 'user-1', now);
  assert.equal(result.sessionId, 'session-created');
  assert.equal(stored.userId, 'user-1');
  assert.equal(stored.tokenHash, hashToken(result.token));
});

test('refresh aktif dirotasi menjadi token baru satu kali pakai', async () => {
  const client = clientFor(activeSession);
  const result = await rotateRefreshSession(client, 'current-token', now);
  assert.notEqual(result.token, 'current-token');
  assert.equal(result.user.id, 'user-1');
  assert.equal(result.sessionId, 'new-session-1');
  assert.equal(client.created.length, 1);
  assert.equal(client.created[0].userId, 'user-1');
  assert.notEqual(client.created[0].tokenHash, hashToken('current-token'));
});

test('refresh yang sudah dicabut selalu ditolak tanpa grace period', async () => {
  const client = clientFor({ ...activeSession, revokedAt: new Date(now) });
  await assert.rejects(
    rotateRefreshSession(client, 'current-token', now),
    error => error.status === 401 && client.created.length === 0
  );
});

test('refresh paralel yang kalah conditional update ditolak', async () => {
  const client = clientFor(activeSession, { updateCount: 0 });
  await assert.rejects(
    rotateRefreshSession(client, 'current-token', now),
    error => error.status === 401 && client.created.length === 0
  );
});

test('refresh expired dan user nonaktif ditolak', async () => {
  const expired = clientFor({ ...activeSession, expiresAt: new Date(now) });
  await assert.rejects(rotateRefreshSession(expired, 'current-token', now), error => error.status === 401);

  const inactive = clientFor({ ...activeSession, user: { ...activeSession.user, isActive: false } });
  await assert.rejects(rotateRefreshSession(inactive, 'current-token', now), error => error.status === 401);
});
