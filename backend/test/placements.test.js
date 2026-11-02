import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertPlacementDocumentMutable,
  placementDocumentFieldsChanged,
  requireDefaultMentor
} from '../src/services/placements.js';

test('mentor aktif yang paling awal dipilih tanpa membuat akun baru', async () => {
  const expected = { id: 'mentor-1', role: 'MENTOR', isActive: true };
  let query;
  const client = {
    user: {
      findFirst: async value => { query = value; return expected; },
      create: async () => assert.fail('service tidak boleh membuat akun mentor')
    }
  };

  assert.equal(await requireDefaultMentor(client), expected);
  assert.deepEqual(query, {
    where: { role: 'MENTOR', isActive: true },
    orderBy: { createdAt: 'asc' }
  });
});

test('ketiadaan mentor menghasilkan error terkontrol tanpa kredensial fallback', async () => {
  const client = { user: { findFirst: async () => null } };
  await assert.rejects(
    requireDefaultMentor(client),
    error => error.status === 409 && error.code === 'MENTOR_NOT_CONFIGURED'
  );
});

const placement = {
  id: 'placement-1',
  officeName: 'Kantor A',
  region: 'Jakarta',
  division: 'Engineering',
  position: 'Intern',
  startDate: new Date('2026-09-01T00:00:00.000Z'),
  endDate: new Date('2026-11-30T00:00:00.000Z')
};

test('field dokumen yang berubah dikenali, termasuk tanggal ekuivalen', () => {
  assert.equal(placementDocumentFieldsChanged(placement, { ...placement }), false);
  assert.equal(placementDocumentFieldsChanged(placement, { ...placement, officeName: 'Kantor B' }), true);
  assert.equal(placementDocumentFieldsChanged(placement, { ...placement, startDate: '2026-09-01' }), false);
});

test('placement ditolak ketika laporan sedang ditinjau atau sudah ditandatangani', async () => {
  for (const status of ['SUBMITTED', 'SIGNED']) {
    const client = { weeklyReport: { findFirst: async () => ({ id: 'report-1', status }) } };
    await assert.rejects(
      assertPlacementDocumentMutable(client, placement, { ...placement, division: 'Finance' }),
      error => error.status === 409 && error.code === 'PLACEMENT_DOCUMENT_LOCKED'
    );
  }
});

test('placement identik tidak melakukan query lock dan draft tetap dapat diubah', async () => {
  let calls = 0;
  const unchangedClient = { weeklyReport: { findFirst: async () => { calls += 1; return null; } } };
  await assertPlacementDocumentMutable(unchangedClient, placement, { ...placement });
  assert.equal(calls, 0);

  const draftClient = { weeklyReport: { findFirst: async () => null } };
  await assert.doesNotReject(assertPlacementDocumentMutable(draftClient, placement, { ...placement, region: 'Bandung' }));
});
