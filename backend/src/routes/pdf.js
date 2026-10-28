import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { appError } from '../middleware/error.js';
import { buildPdf } from '../services/pdf.js';
import { attachActivities } from '../services/report-activities.js';
import { config } from '../config.js';

export const pdfRouter = Router();
pdfRouter.use(authenticate);
const scope = user => user.role === 'MAGANG' ? { placement: { internId: user.id } } : { placement: { mentorId: user.id } };
const include = { placement: true, signedBy: { select: { name: true } }, signatureVersion: true };

pdfRouter.get('/reports/:id/pdf', async (req, res) => {
  const report = await prisma.weeklyReport.findFirst({ where: { id: req.params.id, status: 'SIGNED', ...scope(req.user) }, include });
  if (!report) throw appError(404, 'Laporan final tidak ditemukan atau belum ditandatangani.');
  const [data] = await attachActivities([report]);
  if (!data.activities.length) throw appError(422, 'Laporan kosong tidak dapat diekspor.');
  await buildPdf(res, [data], `Uraian_PKL_Minggu-${String(report.weekIndex).padStart(2, '0')}_${report.weekStart.toISOString().slice(0, 10)}.pdf`);
});

pdfRouter.get('/placements/:id/pdf', async (req, res) => {
  const placement = await prisma.internshipPlacement.findFirst({ where: { id: req.params.id, ...(req.user.role === 'MAGANG' ? { internId: req.user.id } : { mentorId: req.user.id }) } });
  if (!placement) throw appError(404, 'Penempatan tidak ditemukan.');
  const found = await prisma.weeklyReport.findMany({ where: { placementId: placement.id, status: 'SIGNED' }, include, orderBy: { weekStart: 'asc' }, take: config.PDF_EXPORT_MAX_REPORTS });
  const reports = (await attachActivities(found)).filter(report => report.activities.length);
  if (!reports.length) throw appError(422, 'Belum ada laporan bertanda tangan untuk diekspor.');
  await buildPdf(res, reports, `Uraian_PKL_Periode_${placement.startDate.toISOString().slice(0, 10)}_${placement.endDate.toISOString().slice(0, 10)}.pdf`);
});
