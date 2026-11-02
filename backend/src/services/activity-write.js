import { appError } from '../middleware/error.js';
import { indices, isWeekday, parseDateOnly } from '../lib/dates.js';

export async function validateActivityWrite(client, placement, input, ignoreId) {
  const activityDate = parseDateOnly(input.activityDate);
  if (!isWeekday(activityDate)) throw appError(422, 'Kegiatan hanya dapat dicatat pada Senin–Jumat.');
  if (activityDate < placement.startDate || activityDate > placement.endDate) {
    throw appError(422, 'Tanggal kegiatan berada di luar periode PKL.');
  }
  if (input.startTime !== 'WFH' && input.endTime <= input.startTime) {
    throw appError(422, 'Waktu selesai harus setelah waktu mulai.');
  }

  const { weekStart } = indices(placement.startDate, activityDate);
  const report = await client.weeklyReport.findUnique({
    where: { placementId_weekStart: { placementId: placement.id, weekStart } }
  });
  if (report && !['DRAFT', 'RETURNED'].includes(report.status)) {
    throw appError(409, 'Laporan minggu ini sedang dikunci atau sudah ditandatangani.', 'REPORT_LOCKED');
  }

  const duplicate = await client.activity.findFirst({
    where: {
      placementId: placement.id,
      activityDate,
      ...(ignoreId ? { id: { not: ignoreId } } : {})
    }
  });
  if (duplicate) throw appError(409, 'Kegiatan untuk tanggal tersebut sudah ada.', 'DUPLICATE_ACTIVITY_DATE');
  return activityDate;
}
