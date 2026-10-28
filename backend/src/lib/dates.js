const DAY_MS = 86_400_000;

export function parseDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw Object.assign(new Error('Format tanggal harus YYYY-MM-DD.'), { status: 422, code: 'INVALID_DATE' });
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw Object.assign(new Error('Tanggal tidak valid.'), { status: 422, code: 'INVALID_DATE' });
  }
  return date;
}

export function dateOnly(date) { return new Date(date).toISOString().slice(0, 10); }

export function mondayOf(date) {
  const d = new Date(`${dateOnly(date)}T00:00:00.000Z`);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1));
  return d;
}

export function isWeekday(date) { const day = new Date(date).getUTCDay(); return day >= 1 && day <= 5; }
export function addDays(date, count) { return new Date(new Date(date).getTime() + count * DAY_MS); }

export function indices(periodStart, activityDate) {
  const weekStart = mondayOf(activityDate);
  const firstWeek = mondayOf(periodStart);
  const weekIndex = Math.floor((weekStart - firstWeek) / (7 * DAY_MS)) + 1;
  const firstWorkDate = weekStart < new Date(periodStart) ? new Date(periodStart) : weekStart;
  const start = new Date(periodStart);
  const monthIndex = (firstWorkDate.getUTCFullYear() - start.getUTCFullYear()) * 12
    + firstWorkDate.getUTCMonth() - start.getUTCMonth() + 1;
  return { weekStart, weekIndex, monthIndex };
}

export function reportRange(weekStart) { return { gte: mondayOf(weekStart), lte: addDays(mondayOf(weekStart), 4) }; }

export function formatDateId(date) {
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(date));
}
