import test from 'node:test';
import assert from 'node:assert/strict';
import { indices, isWeekday, mondayOf, parseDateOnly } from '../src/lib/dates.js';

test('periode mulai Selasa menjadi minggu pertama parsial', () => {
  const value = indices(new Date('2026-09-01'), new Date('2026-09-04'));
  assert.equal(value.weekStart.toISOString().slice(0, 10), '2026-08-31');
  assert.equal(value.weekIndex, 1);
  assert.equal(value.monthIndex, 1);
});
test('minggu berikutnya dan bulan lintas tahun deterministik', () => {
  assert.equal(indices(new Date('2026-09-01'), new Date('2026-09-07')).weekIndex, 2);
  assert.equal(indices(new Date('2026-09-01'), new Date('2027-01-04')).monthIndex, 5);
});
test('akhir pekan ditolak', () => {
  assert.equal(isWeekday(new Date('2026-09-05')), false);
  assert.equal(mondayOf(new Date('2026-09-06')).toISOString().slice(0, 10), '2026-08-31');
});

test('tanggal harus valid dan menggunakan format date-only', () => {
  assert.equal(parseDateOnly('2026-02-28').toISOString(), '2026-02-28T00:00:00.000Z');
  assert.throws(() => parseDateOnly('2026-02-30'), error => error.status === 422 && error.code === 'INVALID_DATE');
  assert.throws(() => parseDateOnly(undefined), error => error.status === 422 && error.code === 'INVALID_DATE');
});
