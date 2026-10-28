import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { createAccessToken, hashToken, randomToken } from '../lib/auth.js';
import { authenticate } from '../middleware/auth.js';
import { appError } from '../middleware/error.js';
import { config } from '../config.js';

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
  const refreshToken = randomToken();
  await prisma.refreshSession.create({ data: { userId: user.id, tokenHash: hashToken(refreshToken), expiresAt: new Date(Date.now() + 30 * 86_400_000) } });
  res.cookie('refresh_token', refreshToken, { ...cookie, maxAge: 30 * 86_400_000 });
  res.json({
    success: true,
    data: {
      accessToken: await createAccessToken(user),
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    },
    message: 'Login berhasil.'
  });
});

authRouter.post('/refresh', async (req, res) => {
  const raw = req.cookies.refresh_token || req.body?.refreshToken;
  if (!raw) throw appError(401, 'Refresh session tidak tersedia.');
  const tokenHash = hashToken(raw);
  const session = await prisma.refreshSession.findUnique({ where: { tokenHash }, include: { user: true } });

  if (!session) throw appError(401, 'Refresh session tidak valid.');

  // Tangani kemungkinan sesi yang baru di-revoke (grace period 60 detik)
  if (session.revokedAt) {
    const isRecent = (Date.now() - session.revokedAt.getTime()) < 60_000;
    if (isRecent && session.user?.isActive && session.expiresAt > new Date()) {
      const next = randomToken();
      await prisma.refreshSession.create({
        data: { userId: session.userId, tokenHash: hashToken(next), expiresAt: new Date(Date.now() + 30 * 86_400_000) }
      });
      res.cookie('refresh_token', next, { ...cookie, maxAge: 30 * 86_400_000 });
      return res.json({
        success: true,
        data: {
          accessToken: await createAccessToken(session.user),
          refreshToken: next,
          user: { id: session.user.id, name: session.user.name, email: session.user.email, role: session.user.role }
        }
      });
    }
    throw appError(401, 'Refresh session tidak valid.');
  }

  if (session.expiresAt <= new Date() || !session.user?.isActive) throw appError(401, 'Refresh session tidak valid.');

  // Perpanjang masa berlaku sesi refresh aktif (sliding expiration 30 hari)
  await prisma.refreshSession.update({
    where: { id: session.id },
    data: { expiresAt: new Date(Date.now() + 30 * 86_400_000) }
  });

  res.cookie('refresh_token', raw, { ...cookie, maxAge: 30 * 86_400_000 });
  res.json({
    success: true,
    data: {
      accessToken: await createAccessToken(session.user),
      refreshToken: raw,
      user: { id: session.user.id, name: session.user.name, email: session.user.email, role: session.user.role }
    }
  });
});

authRouter.post('/logout', async (req, res) => {
  const raw = req.cookies.refresh_token || req.body?.refreshToken;
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
