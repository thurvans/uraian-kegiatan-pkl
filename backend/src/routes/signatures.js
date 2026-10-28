import { Router } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { appError } from '../middleware/error.js';
import { config } from '../config.js';

export const signaturesRouter = Router();
signaturesRouter.use(authenticate, requireRole('MENTOR'));
const storage = path.resolve(config.SIGNATURE_STORAGE_DIR);

signaturesRouter.get('/me', async (req, res) => {
  const signature = await prisma.mentorSignature.findFirst({ where: { mentorId: req.user.id, isCurrent: true }, select: { id: true, createdAt: true, sha256: true } });
  res.json({ success: true, data: { hasSignature: Boolean(signature), signature } });
});

signaturesRouter.get('/me/image', async (req, res) => {
  const signature = await prisma.mentorSignature.findFirst({ where: { mentorId: req.user.id, isCurrent: true } });
  if (!signature) throw appError(404, 'Tanda tangan belum tersedia.');
  res.type('png').set('Cache-Control', 'private, no-store').send(await fs.readFile(signature.filePath));
});

signaturesRouter.put('/me', async (req, res) => {
  const { imageData } = z.object({ imageData: z.string().max(1_500_000) }).parse(req.body);
  const match = imageData.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw appError(422, 'Tanda tangan harus berupa PNG.');
  const buffer = Buffer.from(match[1], 'base64');
  if (buffer.length < 100 || buffer.length > 750_000 || buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw appError(422, 'Berkas PNG tanda tangan tidak valid atau terlalu besar.');
  const width = buffer.readUInt32BE(16), height = buffer.readUInt32BE(20);
  if (width < 100 || height < 40 || width > 2000 || height > 1000) throw appError(422, 'Dimensi tanda tangan tidak valid.');
  await fs.mkdir(storage, { recursive: true });
  const id = crypto.randomUUID(), filePath = path.join(storage, `${id}.png`), sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  await fs.writeFile(filePath, buffer, { flag: 'wx' });
  try {
    const data = await prisma.$transaction(async tx => {
      await tx.mentorSignature.updateMany({ where: { mentorId: req.user.id, isCurrent: true }, data: { isCurrent: false } });
      const created = await tx.mentorSignature.create({ data: { id, mentorId: req.user.id, filePath, sha256, isCurrent: true } });
      await tx.approvalAudit.create({ data: { actorId: req.user.id, action: 'SIGNATURE_CHANGED', details: { signatureId: id, sha256 } } });
      return created;
    });
    res.json({ success: true, data: { id: data.id, createdAt: data.createdAt }, message: 'Tanda tangan berhasil disimpan.' });
  } catch (error) { await fs.unlink(filePath).catch(() => {}); throw error; }
});
