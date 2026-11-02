const publicUser = { id: true, name: true, email: true, role: true };

export async function resolveAccessUser(client, payload, now = new Date()) {
  if (!payload?.sub || !payload?.sid || !payload?.role) return null;

  return client.user.findFirst({
    where: {
      id: payload.sub,
      isActive: true,
      role: payload.role,
      refreshSessions: {
        some: {
          id: payload.sid,
          revokedAt: null,
          expiresAt: { gt: now }
        }
      }
    },
    select: publicUser
  });
}
