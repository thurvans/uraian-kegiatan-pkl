import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAccessUser } from '../src/services/access-session.js';

const now = new Date('2026-11-02T00:00:00.000Z');

test('access token tanpa identitas user, role, atau sesi ditolak sebelum query', async () => {
  let queries = 0;
  const client = { user: { findFirst: async () => { queries += 1; } } };

  assert.equal(await resolveAccessUser(client, { sub: 'user-1', role: 'MAGANG' }, now), null);
  assert.equal(await resolveAccessUser(client, { sub: 'user-1', sid: 'session-1' }, now), null);
  assert.equal(await resolveAccessUser(client, { role: 'MAGANG', sid: 'session-1' }, now), null);
  assert.equal(queries, 0);
});

test('access user hanya dicari melalui sesi aktif yang terikat pada token', async () => {
  const user = { id: 'user-1', name: 'User', email: 'user@example.com', role: 'MAGANG' };
  let query;
  const client = {
    user: {
      findFirst: async input => {
        query = input;
        return user;
      }
    }
  };

  const result = await resolveAccessUser(client, {
    sub: 'user-1', role: 'MAGANG', sid: 'session-1'
  }, now);

  assert.equal(result, user);
  assert.deepEqual(query.where, {
    id: 'user-1',
    isActive: true,
    role: 'MAGANG',
    refreshSessions: {
      some: {
        id: 'session-1',
        revokedAt: null,
        expiresAt: { gt: now }
      }
    }
  });
  assert.deepEqual(query.select, { id: true, name: true, email: true, role: true });
});

test('hasil kosong dari query sesi aktif diperlakukan sebagai sesi tidak valid', async () => {
  const client = { user: { findFirst: async () => null } };
  const result = await resolveAccessUser(client, {
    sub: 'user-1', role: 'MAGANG', sid: 'revoked-session'
  }, now);
  assert.equal(result, null);
});
