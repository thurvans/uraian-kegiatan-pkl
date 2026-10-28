import test from 'node:test';
import assert from 'node:assert/strict';
import { attachActivities } from '../src/services/report-activities.js';

test('attachActivities mengambil seluruh kegiatan dengan satu query dan mengelompokkannya', async () => {
  const reports = [
    { id: 'r1', placementId: 'p1', weekStart: new Date('2026-10-05') },
    { id: 'r2', placementId: 'p1', weekStart: new Date('2026-10-12') }
  ];
  const activities = [
    { id: 'a2', placementId: 'p1', activityDate: new Date('2026-10-13') },
    { id: 'a1', placementId: 'p1', activityDate: new Date('2026-10-06') }
  ];
  let calls = 0;
  const client = {
    activity: {
      findMany: async query => {
        calls += 1;
        assert.equal(query.where.OR.length, 2);
        return activities;
      }
    }
  };

  const result = await attachActivities(reports, client);
  assert.equal(calls, 1);
  assert.deepEqual(result.map(report => report.activities.map(activity => activity.id)), [['a1'], ['a2']]);
});

test('attachActivities tidak mengakses database untuk daftar kosong', async () => {
  const client = { activity: { findMany: async () => assert.fail('query tidak boleh dijalankan') } };
  assert.deepEqual(await attachActivities([], client), []);
});
