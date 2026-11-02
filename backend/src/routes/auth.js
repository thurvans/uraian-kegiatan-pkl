import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { createAccessToken, hashToken } from '../lib/auth.js';
import { authenticate } from '../middleware/auth.js';
import { appError } from '../middleware/error.js';
import { config } from '../config.js';
import { createRefreshSession, rotateRefreshSession } from '../services/refresh-session.js';

export const authRouter = Router();
const cookie = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: config.COOKIE_SAME_SITE,
  path: '/'
};

authRouter.post('/login', async (req, res) => {
  const input = z.object({ email: z.string().email(), password: z.string().min(8).max(128) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email.trim().toLowerCase() } });
  if (!user?.isActive || !(await bcrypt.compare(input.password, user.passwordHash))) throw appError(401, 'Email atau password salah.');
  const { token: refreshToken, sessionId } = await createRefreshSession(prisma, user.id);
  res.cookie('refresh_token', refreshToken, { ...cookie, maxAge: 30 * 86_400_000 });
  res.json({
    success: true,
    data: {
      accessToken: await createAccessToken(user, sessionId),
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    },
    message: 'Login berhasil.'
  });
});

authRouter.post('/refresh', async (req, res) => {
  const { token, user, sessionId } = await rotateRefreshSession(prisma, req.cookies.refresh_token);
  res.cookie('refresh_token', token, { ...cookie, maxAge: 30 * 86_400_000 });
  res.json({
    success: true,
    data: {
      accessToken: await createAccessToken(user, sessionId),
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    }
  });
});

authRouter.post('/logout', async (req, res) => {
  const raw = req.cookies.refresh_token;
  if (raw) await prisma.refreshSession.updateMany({ where: { tokenHash: hashToken(raw), revokedAt: null }, data: { revokedAt: new Date() } });
  res.clearCookie('refresh_token', cookie).json({ success: true, message: 'Logout berhasil.' });
});

authRouter.get('/me', authenticate, (req, res) => res.json({ success: true, data: req.user }));
authRouter.patch('/me', authenticate, async (req, res) => {
  const input = z.object({
    name: z.string().trim().min(2, 'Nama minimal 2 karakter.').max(80, 'Nama maksimal 80 karakter.')
  }).parse(req.body);
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { name: input.name },
    select: { id: true, name: true, email: true, role: true }
  });
  res.json({ success: true, data: user, message: 'Nama profil berhasil diperbarui.' });
});
authRouter.patch('/password', authenticate, async (req, res) => {
  const input = z.object({ currentPassword: z.string().min(8), newPassword: z.string().min(12).max(128) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!(await bcrypt.compare(input.currentPassword, user.passwordHash))) throw appError(422, 'Password saat ini salah.');
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(input.newPassword, 12) } }),
    prisma.refreshSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } })
  ]);
  res.clearCookie('refresh_token', cookie).json({ success: true, message: 'Password berhasil diubah. Silakan login kembali.' });
});
