import test from 'node:test';
import assert from 'node:assert/strict';
import { serializableTransaction } from '../src/lib/transactions.js';

test('transaksi serializable me-retry konflik Prisma P2034', async () => {
  let attempts = 0;
  const client = {
    $transaction: async (operation, options) => {
      attempts += 1;
      assert.equal(options.isolationLevel, 'Serializable');
      if (attempts < 3) throw Object.assign(new Error('write conflict'), { code: 'P2034' });
      return operation({ attempt: attempts });
    }
  };

  const result = await serializableTransaction(client, async tx => tx.attempt);
  assert.equal(result, 3);
  assert.equal(attempts, 3);
});

test('konflik berulang dipetakan menjadi 409 yang dapat dicoba ulang pengguna', async () => {
  const client = {
    $transaction: async () => { throw Object.assign(new Error('write conflict'), { code: 'P2034' }); }
  };
  await assert.rejects(
    serializableTransaction(client, async () => null, 2),
    error => error.status === 409 && error.code === 'CONCURRENT_MODIFICATION'
  );
});

test('error bisnis tidak di-retry atau ditutupi', async () => {
  const expected = Object.assign(new Error('locked'), { status: 409, code: 'REPORT_LOCKED' });
  let attempts = 0;
  const client = { $transaction: async () => { attempts += 1; throw expected; } };
  await assert.rejects(serializableTransaction(client, async () => null), error => error === expected);
  assert.equal(attempts, 1);
});
