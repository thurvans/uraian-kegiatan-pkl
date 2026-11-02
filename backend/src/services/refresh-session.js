import { hashToken, randomToken } from '../lib/auth.js';
import { appError } from '../middleware/error.js';

const REFRESH_TTL_MS = 30 * 86_400_000;

export function refreshSessionExpiry(now = new Date()) {
  return new Date(now.getTime() + REFRESH_TTL_MS);
}

export async function createRefreshSession(client, userId, now = new Date()) {
  const token = randomToken();
  const session = await client.refreshSession.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: refreshSessionExpiry(now)
    }
  });
  return { token, sessionId: session.id };
}

export async function rotateRefreshSession(client, rawToken, now = new Date()) {
  if (!rawToken) throw appError(401, 'Refresh session tidak tersedia.');

  return client.$transaction(async tx => {
    const session = await tx.refreshSession.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: { user: true }
    });
    if (!session || session.revokedAt || session.expiresAt <= now || !session.user?.isActive) {
      throw appError(401, 'Refresh session tidak valid.');
    }

    // Conditional update makes the token single-use even when refresh requests race.
    const revoked = await tx.refreshSession.updateMany({
      where: { id: session.id, revokedAt: null, expiresAt: { gt: now } },
      data: { revokedAt: now }
    });
    if (revoked.count !== 1) throw appError(401, 'Refresh session tidak valid.');

    const token = randomToken();
    const nextSession = await tx.refreshSession.create({
      data: {
        userId: session.userId,
        tokenHash: hashToken(token),
        expiresAt: refreshSessionExpiry(now)
      }
    });
    return { token, user: session.user, sessionId: nextSession.id };
  });
}
