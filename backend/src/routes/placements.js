import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { appError } from '../middleware/error.js';
import { parseDateOnly } from '../lib/dates.js';

export const placementsRouter = Router();
placementsRouter.use(authenticate);

async function findOrCreateDefaultMentor() {
  let mentor = await prisma.user.findFirst({
    where: { role: 'MENTOR', isActive: true },
    orderBy: { createdAt: 'asc' }
  });
  if (!mentor) {
    const passwordHash = await bcrypt.hash('Password123!', 12);
    mentor = await prisma.user.create({
      data: {
        name: 'Mentor Pembimbing',
        email: 'mentor@pkl.local',
        passwordHash,
        role: 'MENTOR'
      }
    });
  }
  return mentor;
}

function getDefaultPlacementDates() {
  const today = new Date();
  const startDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const endDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 3, 0));
  return { startDate, endDate };
}

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
  let data = await prisma.internshipPlacement.findFirst({
    where: { internId: req.user.id },
    include: { mentor: { select: { id: true, name: true, email: true } } }
  });

  if (!data) {
    const mentor = await findOrCreateDefaultMentor();
    const { startDate, endDate } = getDefaultPlacementDates();
    data = await prisma.internshipPlacement.create({
      data: {
        internId: req.user.id,
        mentorId: mentor.id,
        officeName: 'Instansi / Kantor PKL',
        region: 'Jakarta',
        division: 'Divisi Magang',
        position: 'Peserta PKL',
        startDate,
        endDate
      },
      include: { mentor: { select: { id: true, name: true, email: true } } }
    });
  }

  res.json({ success: true, data });
});

placementsRouter.put('/me', requireRole('MAGANG'), async (req, res) => {
  const input = z.object({
    officeName: z.string().trim().min(1).max(200),
    region: z.string().trim().min(1).max(150),
    division: z.string().trim().min(1).max(150),
    position: z.string().trim().min(1).max(100),
    startDate: z.string(),
    endDate: z.string()
  }).parse(req.body);

  const startDate = parseDateOnly(input.startDate);
  const endDate = parseDateOnly(input.endDate);
  if (endDate < startDate) throw appError(422, 'Tanggal selesai tidak boleh sebelum tanggal mulai.');

  let current = await prisma.internshipPlacement.findFirst({ where: { internId: req.user.id } });

  if (!current) {
    const mentor = await findOrCreateDefaultMentor();
    const data = await prisma.internshipPlacement.create({
      data: {
        internId: req.user.id,
        mentorId: mentor.id,
        ...input,
        startDate,
        endDate
      },
      include: { mentor: { select: { id: true, name: true, email: true } } }
    });
    return res.json({ success: true, data, message: 'Identitas PKL berhasil disimpan.' });
  }

  const changedPeriod = +startDate !== +current.startDate || +endDate !== +current.endDate;
  if (changedPeriod && await prisma.weeklyReport.count({ where: { placementId: current.id, status: 'SIGNED' } })) {
    throw appError(409, 'Periode tidak dapat diubah karena sudah ada laporan yang ditandatangani.');
  }

  const data = await prisma.internshipPlacement.update({
    where: { id: current.id },
    data: { ...input, startDate, endDate },
    include: { mentor: { select: { id: true, name: true, email: true } } }
  });
  res.json({ success: true, data, message: 'Identitas PKL berhasil disimpan.' });
});

