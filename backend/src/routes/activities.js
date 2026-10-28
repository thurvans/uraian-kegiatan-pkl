import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { appError } from '../middleware/error.js';
import { dateOnly, indices, isWeekday, parseDateOnly, reportRange } from '../lib/dates.js';

export const activitiesRouter = Router();
activitiesRouter.use(authenticate, requireRole('MAGANG'));
const clockTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const activitySchema = z.object({
  activityDate: z.string(),
  startTime: z.union([clockTimeSchema, z.literal('WFH')]),
  endTime: z.union([clockTimeSchema, z.literal('WFH')]),
  description: z.string().trim().min(5).max(5000)
}).refine(input => (input.startTime === 'WFH') === (input.endTime === 'WFH'), {
  message: 'Mode WFH harus dipilih untuk seluruh waktu kegiatan.',
  path: ['endTime']
});

async function placementOf(userId) {
  const placement = await prisma.internshipPlacement.findFirst({ where: { internId: userId } });
  if (!placement) throw appError(404, 'Penempatan PKL belum tersedia.');
  return placement;
}
async function validate(placement, input, ignoreId) {
  const activityDate = parseDateOnly(input.activityDate);
  if (!isWeekday(activityDate)) throw appError(422, 'Kegiatan hanya dapat dicatat pada Senin–Jumat.');
  if (activityDate < placement.startDate || activityDate > placement.endDate) throw appError(422, 'Tanggal kegiatan berada di luar periode PKL.');
  if (input.startTime !== 'WFH' && input.endTime <= input.startTime) throw appError(422, 'Waktu selesai harus setelah waktu mulai.');
  const { weekStart } = indices(placement.startDate, activityDate);
  const report = await prisma.weeklyReport.findUnique({ where: { placementId_weekStart: { placementId: placement.id, weekStart } } });
  if (report && !['DRAFT', 'RETURNED'].includes(report.status)) throw appError(409, 'Laporan minggu ini sedang dikunci atau sudah ditandatangani.');
  const duplicate = await prisma.activity.findFirst({ where: { placementId: placement.id, activityDate, ...(ignoreId ? { id: { not: ignoreId } } : {}) } });
  if (duplicate) throw appError(409, 'Kegiatan untuk tanggal tersebut sudah ada.');
  return activityDate;
}

async function removeEmptyReports(client, placement, weekStarts) {
  let deletedCount = 0;
  for (const weekStart of weekStarts) {
    const activityCount = await client.activity.count({
      where: { placementId: placement.id, activityDate: reportRange(weekStart) }
    });
    if (activityCount) continue;
    const deleted = await client.weeklyReport.deleteMany({
      where: { placementId: placement.id, weekStart, status: { in: ['DRAFT', 'RETURNED'] } }
    });
    deletedCount += deleted.count;
  }
  return deletedCount;
}

activitiesRouter.get('/', async (req, res) => {
  const placement = await placementOf(req.user.id);
  const weekStart = req.query.weekStart ? parseDateOnly(req.query.weekStart) : null;
  const data = await prisma.activity.findMany({ where: { placementId: placement.id, ...(weekStart ? { activityDate: reportRange(weekStart) } : {}) }, orderBy: { activityDate: 'desc' } });
  res.json({ success: true, data });
});

activitiesRouter.post('/', async (req, res) => {
  const input = activitySchema.parse(req.body), placement = await placementOf(req.user.id);
  const activityDate = await validate(placement, input);
  const meta = indices(placement.startDate, activityDate);
  const data = await prisma.$transaction(async tx => {
    await tx.weeklyReport.upsert({ where: { placementId_weekStart: { placementId: placement.id, weekStart: meta.weekStart } }, update: {}, create: { placementId: placement.id, ...meta } });
    return tx.activity.create({ data: { ...input, activityDate, placementId: placement.id } });
  });
  res.status(201).json({ success: true, data, message: 'Kegiatan berhasil disimpan.' });
});

activitiesRouter.patch('/:id', async (req, res) => {
  const input = activitySchema.parse(req.body), placement = await placementOf(req.user.id);
  const current = await prisma.activity.findFirst({ where: { id: req.params.id, placementId: placement.id } });
  if (!current) throw appError(404, 'Kegiatan tidak ditemukan.');
  const activityDate = await validate(placement, input, current.id);
  if (dateOnly(activityDate) !== dateOnly(current.activityDate)) throw appError(422, 'Tanggal kegiatan tidak dapat dipindahkan; hapus lalu buat pada tanggal baru.');
  const data = await prisma.activity.update({ where: { id: current.id }, data: { ...input, activityDate } });
  res.json({ success: true, data, message: 'Kegiatan berhasil diperbarui.' });
});

activitiesRouter.delete('/batch', async (req, res) => {
  const input = z.object({ activityIds: z.array(z.string().uuid()).min(1).max(500) }).parse(req.body);
  const ids = [...new Set(input.activityIds)];
  if (ids.length !== input.activityIds.length) throw appError(422, 'Daftar kegiatan mengandung ID duplikat.');
  const placement = await placementOf(req.user.id);
  const result = await prisma.$transaction(async tx => {
    const activities = await tx.activity.findMany({ where: { id: { in: ids }, placementId: placement.id } });
    if (activities.length !== ids.length) throw appError(404, 'Salah satu kegiatan tidak ditemukan. Tidak ada kegiatan yang dihapus.');
    const weekStartValues = [...new Set(activities.map(activity => dateOnly(indices(placement.startDate, activity.activityDate).weekStart)))];
    const weekStarts = weekStartValues.map(parseDateOnly);
    const lockedReport = await tx.weeklyReport.findFirst({
      where: { placementId: placement.id, weekStart: { in: weekStarts }, status: { notIn: ['DRAFT', 'RETURNED'] } }
    });
    if (lockedReport) throw appError(409, 'Salah satu kegiatan berada pada laporan terkunci. Tidak ada kegiatan yang dihapus.');
    const deletedActivities = await tx.activity.deleteMany({ where: { id: { in: ids }, placementId: placement.id } });
    const deletedReports = await removeEmptyReports(tx, placement, weekStarts);
    return { deletedActivities: deletedActivities.count, deletedReports };
  }, { isolationLevel: 'Serializable' });
  res.json({ success: true, data: result, message: `${result.deletedActivities} kegiatan berhasil dihapus dari riwayat dan laporan.` });
});

activitiesRouter.delete('/:id', async (req, res) => {
  const placement = await placementOf(req.user.id);
  const result = await prisma.$transaction(async tx => {
    const current = await tx.activity.findFirst({ where: { id: req.params.id, placementId: placement.id } });
    if (!current) throw appError(404, 'Kegiatan tidak ditemukan.');
    const weekStart = indices(placement.startDate, current.activityDate).weekStart;
    const report = await tx.weeklyReport.findUnique({ where: { placementId_weekStart: { placementId: placement.id, weekStart } } });
    if (report && !['DRAFT', 'RETURNED'].includes(report.status)) throw appError(409, 'Kegiatan pada laporan terkunci tidak dapat dihapus.');
    await tx.activity.delete({ where: { id: current.id } });
    const deletedReports = await removeEmptyReports(tx, placement, [weekStart]);
    return { deletedActivities: 1, deletedReports };
  }, { isolationLevel: 'Serializable' });
  res.json({ success: true, data: result, message: 'Kegiatan berhasil dihapus dari riwayat dan laporan.' });
});
