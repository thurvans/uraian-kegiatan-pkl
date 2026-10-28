import { prisma } from '../lib/prisma.js';
import { reportRange } from '../lib/dates.js';

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

  return reports.map(report => {
    const range = reportRange(report.weekStart);
    return {
      ...report,
      activities: activities.filter(activity =>
        activity.placementId === report.placementId
        && activity.activityDate >= range.gte
        && activity.activityDate <= range.lte)
    };
  });
}
