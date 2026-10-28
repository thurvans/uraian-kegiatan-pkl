import crypto from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { config } from '../config.js';

const key = new TextEncoder().encode(config.JWT_SIGNING_SECRET);
export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
export const randomToken = () => crypto.randomBytes(48).toString('base64url');

export async function createAccessToken(user) {
  return new SignJWT({ role: user.role }).setProtectedHeader({ alg: 'HS256' }).setSubject(user.id)
    .setIssuer(config.JWT_ISSUER).setAudience(config.JWT_AUDIENCE).setJti(crypto.randomUUID())
    .setIssuedAt().setExpirationTime(`${config.JWT_ACCESS_TTL_MINUTES}m`).sign(key);
}

export async function verifyAccessToken(token) {
  const { payload } = await jwtVerify(token, key, { issuer: config.JWT_ISSUER, audience: config.JWT_AUDIENCE });
  return payload;
}
