import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { appError } from '../middleware/error.js';
import { reportRange } from '../lib/dates.js';
import { attachActivities } from '../services/report-activities.js';

export const reportsRouter = Router();
reportsRouter.use(authenticate);

function scope(user) { return user.role === 'MAGANG' ? { placement: { internId: user.id } } : { placement: { mentorId: user.id } }; }

reportsRouter.get('/', async (req, res) => {
  const allowed = ['DRAFT', 'SUBMITTED', 'RETURNED', 'SIGNED'];
  const status = req.query.status && allowed.includes(req.query.status) ? req.query.status : undefined;
  const reports = await prisma.weeklyReport.findMany({ where: { ...scope(req.user), ...(status ? { status } : {}) }, include: { placement: { include: { intern: { select: { id: true, name: true } }, mentor: { select: { id: true, name: true } } } } }, orderBy: { weekStart: 'desc' } });
  res.json({ success: true, data: await attachActivities(reports) });
});

reportsRouter.get('/:id', async (req, res) => {
  const report = await prisma.weeklyReport.findFirst({ where: { id: req.params.id, ...scope(req.user) }, include: { placement: { include: { intern: { select: { name: true } }, mentor: { select: { name: true } } } }, audits: { orderBy: { createdAt: 'desc' } } } });
  if (!report) throw appError(404, 'Laporan tidak ditemukan.');
  const [data] = await attachActivities([report]);
  res.json({ success: true, data });
});

reportsRouter.post('/submit-batch', requireRole('MAGANG'), async (req, res) => {
  const input = z.object({ reportIds: z.array(z.string().uuid()).min(1).max(100) }).parse(req.body);
  const ids = [...new Set(input.reportIds)];
  if (ids.length !== input.reportIds.length) throw appError(422, 'Daftar laporan mengandung ID duplikat.');
  const result = await prisma.$transaction(async tx => {
    const reports = await tx.weeklyReport.findMany({
      where: { id: { in: ids }, placement: { internId: req.user.id } },
      orderBy: { weekStart: 'asc' }
    });
    if (reports.length !== ids.length || reports.some(report => !['DRAFT', 'RETURNED'].includes(report.status))) {
      throw appError(409, 'Semua laporan harus milik Anda dan dapat diajukan. Tidak ada laporan yang diubah.');
    }
    let activities = 0;
    for (const report of reports) {
      const count = await tx.activity.count({ where: { placementId: report.placementId, activityDate: reportRange(report.weekStart) } });
      if (!count) throw appError(422, 'Salah satu laporan kosong. Tidak ada laporan yang diajukan.');
      const changed = await tx.weeklyReport.updateMany({
        where: { id: report.id, status: report.status },
        data: { status: 'SUBMITTED', submittedAt: new Date(), returnReason: null, revision: report.status === 'RETURNED' ? { increment: 1 } : undefined }
      });
      if (changed.count !== 1) throw appError(409, 'Status laporan berubah bersamaan. Tidak ada laporan yang diubah.');
      await tx.approvalAudit.create({
        data: { reportId: report.id, actorId: req.user.id, action: 'SUBMITTED', beforeStatus: report.status, afterStatus: 'SUBMITTED', details: { activityCount: count } }
      });
      activities += count;
    }
    return { submittedReportCount: reports.length, submittedActivityCount: activities };
  }, { isolationLevel: 'Serializable' });
  res.json({ success: true, data: result, message: `${result.submittedReportCount} laporan berhasil diajukan kepada mentor.` });
});

reportsRouter.post('/:id/submit', requireRole('MAGANG'), async (req, res) => {
  const data = await prisma.$transaction(async tx => {
    const report = await tx.weeklyReport.findFirst({ where: { id: req.params.id, placement: { internId: req.user.id } } });
    if (!report) throw appError(404, 'Laporan tidak ditemukan.');
    if (!['DRAFT', 'RETURNED'].includes(report.status)) throw appError(409, 'Laporan tidak dapat diajukan dari status saat ini.');
    const count = await tx.activity.count({ where: { placementId: report.placementId, activityDate: reportRange(report.weekStart) } });
    if (!count) throw appError(422, 'Laporan kosong tidak dapat diajukan.');
    const changed = await tx.weeklyReport.updateMany({
      where: { id: report.id, status: report.status },
      data: { status: 'SUBMITTED', submittedAt: new Date(), returnReason: null, revision: report.status === 'RETURNED' ? { increment: 1 } : undefined }
    });
    if (changed.count !== 1) throw appError(409, 'Status laporan berubah bersamaan. Laporan tidak diubah.');
    await tx.approvalAudit.create({ data: { reportId: report.id, actorId: req.user.id, action: 'SUBMITTED', beforeStatus: report.status, afterStatus: 'SUBMITTED', details: { activityCount: count } } });
    return tx.weeklyReport.findUnique({ where: { id: report.id } });
  }, { isolationLevel: 'Serializable' });
  res.json({ success: true, data, message: 'Laporan berhasil diajukan kepada mentor.' });
});

reportsRouter.post('/:id/return', requireRole('MENTOR'), async (req, res) => {
  const { reason } = z.object({ reason: z.string().trim().min(5).max(1000) }).parse(req.body);
  const data = await prisma.$transaction(async tx => {
    const report = await tx.weeklyReport.findFirst({ where: { id: req.params.id, status: 'SUBMITTED', placement: { mentorId: req.user.id } } });
    if (!report) throw appError(409, 'Laporan tidak tersedia atau bukan berstatus diajukan.');
    const changed = await tx.weeklyReport.updateMany({ where: { id: report.id, status: 'SUBMITTED' }, data: { status: 'RETURNED', returnReason: reason } });
    if (changed.count !== 1) throw appError(409, 'Status laporan berubah bersamaan. Laporan tidak diubah.');
    await tx.approvalAudit.create({ data: { reportId: report.id, actorId: req.user.id, action: 'RETURNED', beforeStatus: 'SUBMITTED', afterStatus: 'RETURNED', details: { reason } } });
    return tx.weeklyReport.findUnique({ where: { id: report.id } });
  }, { isolationLevel: 'Serializable' });
  res.json({ success: true, data, message: 'Laporan dikembalikan untuk revisi.' });
});

reportsRouter.post('/sign-batch', requireRole('MENTOR'), async (req, res) => {
  const input = z.object({ reportIds: z.array(z.string().uuid()).min(1).max(30), confirm: z.literal(true) }).parse(req.body);
  const ids = [...new Set(input.reportIds)];
  if (ids.length !== input.reportIds.length) throw appError(422, 'Daftar laporan mengandung ID duplikat.');
  const signature = await prisma.mentorSignature.findFirst({ where: { mentorId: req.user.id, isCurrent: true } });
  if (!signature) throw appError(422, 'Simpan spesimen tanda tangan terlebih dahulu.');
  const result = await prisma.$transaction(async tx => {
    const reports = await tx.weeklyReport.findMany({ where: { id: { in: ids }, placement: { mentorId: req.user.id } }, orderBy: { weekStart: 'asc' } });
    if (reports.length !== ids.length || reports.some(r => r.status !== 'SUBMITTED')) throw appError(409, 'Semua laporan harus milik Anda dan berstatus SUBMITTED. Tidak ada laporan yang diubah.');
    let activities = 0;
    for (const report of reports) {
      const count = await tx.activity.count({ where: { placementId: report.placementId, activityDate: reportRange(report.weekStart) } });
      if (!count) throw appError(409, 'Salah satu laporan tidak memiliki kegiatan. Tidak ada laporan yang diubah.');
      const changed = await tx.weeklyReport.updateMany({ where: { id: report.id, status: 'SUBMITTED' }, data: { status: 'SIGNED', signedAt: new Date(), signedById: req.user.id, signatureVersionId: signature.id, returnReason: null } });
      if (changed.count !== 1) throw appError(409, 'Status laporan berubah bersamaan. Tidak ada laporan yang diubah.');
      await tx.approvalAudit.create({ data: { reportId: report.id, actorId: req.user.id, action: 'SIGNED', beforeStatus: 'SUBMITTED', afterStatus: 'SIGNED', details: { activityCount: count, signatureVersionId: signature.id } } });
      activities += count;
    }
    return { signedReportCount: reports.length, signedActivityCount: activities };
  }, { isolationLevel: 'Serializable' });
  res.json({ success: true, data: result, message: `${result.signedReportCount} laporan (${result.signedActivityCount} kegiatan) berhasil divalidasi mentor.` });
});
