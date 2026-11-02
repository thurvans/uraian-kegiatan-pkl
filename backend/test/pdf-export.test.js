import test from 'node:test';
import assert from 'node:assert/strict';
import { assertCompletePdfReports, enforcePdfExportLimit } from '../src/services/pdf-export.js';

const reports = count => Array.from({ length: count }, (_, index) => ({
  id: `report-${index + 1}`,
  activities: [{ id: `activity-${index + 1}` }]
}));

test('ekspor tepat pada batas tetap diizinkan tanpa memotong data', () => {
  const input = reports(30);
  assert.equal(enforcePdfExportLimit(input, 30), input);
  assert.equal(assertCompletePdfReports(input), input);
});

test('ekspor yang melebihi batas ditolak secara eksplisit', () => {
  assert.throws(
    () => enforcePdfExportLimit(reports(31), 30),
    error => error.status === 422 && error.code === 'PDF_EXPORT_LIMIT_EXCEEDED'
  );
});

test('daftar kosong dan laporan signed tanpa kegiatan tidak menghasilkan PDF parsial', () => {
  assert.throws(
    () => assertCompletePdfReports([]),
    error => error.status === 422 && error.code === 'NO_SIGNED_REPORTS'
  );
  assert.throws(
    () => assertCompletePdfReports([{ id: 'report-empty', activities: [] }]),
    error => error.status === 422 && error.code === 'INCOMPLETE_SIGNED_REPORT'
  );
});
