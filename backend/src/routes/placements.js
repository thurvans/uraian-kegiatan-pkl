import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { appError } from '../middleware/error.js';
import { parseDateOnly } from '../lib/dates.js';

export const placementsRouter = Router();
placementsRouter.use(authenticate);

placementsRouter.get('/mentees', requireRole('MENTOR'), async (req, res) => {
  const data = await prisma.internshipPlacement.findMany({
    where: { mentorId: req.user.id },
    include: {
      intern: { select: { id: true, name: true, email: true } },
      _count: { select: { activities: true, reports: true } }
    },
    orderBy: [{ intern: { name: 'asc' } }, { startDate: 'desc' }]
  });
  res.json({ success: true, data });
});

placementsRouter.get('/me', requireRole('MAGANG'), async (req, res) => {
  const data = await prisma.internshipPlacement.findFirst({ where: { internId: req.user.id }, include: { mentor: { select: { id: true, name: true, email: true } } } });
  if (!data) throw appError(404, 'Penempatan PKL belum dibuat.');
  res.json({ success: true, data });
});

placementsRouter.put('/me', requireRole('MAGANG'), async (req, res) => {
  const input = z.object({
    officeName: z.string().trim().min(1).max(200), region: z.string().trim().min(1).max(150),
    division: z.string().trim().min(1).max(150), position: z.string().trim().min(1).max(100),
    startDate: z.string(), endDate: z.string()
  }).parse(req.body);
  const current = await prisma.internshipPlacement.findFirst({ where: { internId: req.user.id } });
  if (!current) throw appError(404, 'Penempatan PKL belum dibuat.');
  const startDate = parseDateOnly(input.startDate), endDate = parseDateOnly(input.endDate);
  if (endDate < startDate) throw appError(422, 'Tanggal selesai tidak boleh sebelum tanggal mulai.');
  const changedPeriod = +startDate !== +current.startDate || +endDate !== +current.endDate;
  if (changedPeriod && await prisma.weeklyReport.count({ where: { placementId: current.id, status: 'SIGNED' } })) throw appError(409, 'Periode tidak dapat diubah karena sudah ada laporan yang ditandatangani.');
  const data = await prisma.internshipPlacement.update({ where: { id: current.id }, data: { ...input, startDate, endDate } });
  res.json({ success: true, data, message: 'Identitas PKL berhasil disimpan.' });
});
