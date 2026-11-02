import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { appError } from '../middleware/error.js';
import { parseDateOnly } from '../lib/dates.js';
import { serializableTransaction } from '../lib/transactions.js';
import { assertPlacementDocumentMutable, requireDefaultMentor } from '../services/placements.js';

export const placementsRouter = Router();
placementsRouter.use(authenticate);

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
    const mentor = await requireDefaultMentor(prisma);
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

  const next = { ...input, startDate, endDate };
  const data = await serializableTransaction(prisma, async tx => {
    const current = await tx.internshipPlacement.findFirst({ where: { internId: req.user.id } });
    if (!current) {
      const mentor = await requireDefaultMentor(tx);
      return tx.internshipPlacement.create({
        data: { internId: req.user.id, mentorId: mentor.id, ...next },
        include: { mentor: { select: { id: true, name: true, email: true } } }
      });
    }

    await assertPlacementDocumentMutable(tx, current, next);
    return tx.internshipPlacement.update({
      where: { id: current.id },
      data: next,
      include: { mentor: { select: { id: true, name: true, email: true } } }
    });
  });
  res.json({ success: true, data, message: 'Identitas PKL berhasil disimpan.' });
});

