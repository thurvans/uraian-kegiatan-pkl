import { prisma } from '../lib/prisma.js';
import { verifyAccessToken } from '../lib/auth.js';

export async function authenticate(req, res, next) {
  try {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) return res.status(401).json({ success: false, message: 'Autentikasi diperlukan.' });
    const payload = await verifyAccessToken(token);
    const user = await prisma.user.findFirst({ where: { id: payload.sub, isActive: true }, select: { id: true, name: true, email: true, role: true } });
    if (!user || user.role !== payload.role) return res.status(401).json({ success: false, message: 'Sesi tidak valid.' });
    req.user = user;
    next();
  } catch { return res.status(401).json({ success: false, message: 'Token tidak valid atau kedaluwarsa.' }); }
}

export const requireRole = (...roles) => (req, res, next) => roles.includes(req.user.role)
  ? next() : res.status(403).json({ success: false, message: 'Anda tidak berhak melakukan tindakan ini.' });
