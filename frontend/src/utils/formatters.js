const fullDateFormatter = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
});
const shortDateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'
});
const dayFormatter = new Intl.DateTimeFormat('id-ID', { weekday: 'short', timeZone: 'UTC' });

export function dateValue(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

export function displayDateValue(value) {
  const iso = dateValue(value);
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

export const fmtDate = value => fullDateFormatter.format(new Date(value));
export const fmtDateShort = value => shortDateFormatter.format(new Date(value));
export const fmtDay = value => dayFormatter.format(new Date(value));
export const fmtTimeRange = (startTime, endTime) => startTime === 'WFH' || endTime === 'WFH'
  ? 'WFH'
  : `${startTime.replace(':', '.')} s/d ${endTime.replace(':', '.')}`;
