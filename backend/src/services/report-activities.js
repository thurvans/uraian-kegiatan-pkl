import { prisma } from '../lib/prisma.js';
import { dateOnly, mondayOf, reportRange } from '../lib/dates.js';

export async function attachActivities(reports, client = prisma) {
  if (!reports.length) return [];

  const activities = await client.activity.findMany({
    where: {
      OR: reports.map(report => ({
        placementId: report.placementId,
        activityDate: reportRange(report.weekStart)
      }))
    },
    orderBy: { activityDate: 'asc' }
  });

  const grouped = new Map();
  for (const activity of activities) {
    const key = `${activity.placementId}:${dateOnly(mondayOf(activity.activityDate))}`;
    const bucket = grouped.get(key);
    if (bucket) bucket.push(activity);
    else grouped.set(key, [activity]);
  }

  return reports.map(report => ({
    ...report,
    activities: grouped.get(`${report.placementId}:${dateOnly(mondayOf(report.weekStart))}`) || []
  }));
}
