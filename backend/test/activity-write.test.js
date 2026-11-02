import test from 'node:test';
import assert from 'node:assert/strict';
import { validateActivityWrite } from '../src/services/activity-write.js';

const placement = {
  id: 'placement-1',
  startDate: new Date('2026-09-01T00:00:00.000Z'),
  endDate: new Date('2026-11-30T00:00:00.000Z')
};
const input = {
  activityDate: '2026-09-07',
  startTime: '08:00',
  endTime: '16:00',
  description: 'Mengerjakan integrasi API'
};

function clientWithStatus(status, duplicate = null) {
  return {
    weeklyReport: { findUnique: async () => status ? { status } : null },
    activity: { findFirst: async () => duplicate }
  };
}

test('activity pada laporan submitted atau signed selalu ditolak', async () => {
  for (const status of ['SUBMITTED', 'SIGNED']) {
    await assert.rejects(
      validateActivityWrite(clientWithStatus(status), placement, input),
      error => error.status === 409 && error.code === 'REPORT_LOCKED'
    );
  }
});

test('activity pada draft/returned tetap dapat dibuat atau diedit', async () => {
  for (const status of ['DRAFT', 'RETURNED']) {
    const date = await validateActivityWrite(clientWithStatus(status), placement, input, 'activity-1');
    assert.equal(date.toISOString(), '2026-09-07T00:00:00.000Z');
  }
});

test('tanggal duplikat ditolak di dalam boundary validasi write', async () => {
  await assert.rejects(
    validateActivityWrite(clientWithStatus('DRAFT', { id: 'activity-2' }), placement, input),
    error => error.status === 409 && error.code === 'DUPLICATE_ACTIVITY_DATE'
  );
});
