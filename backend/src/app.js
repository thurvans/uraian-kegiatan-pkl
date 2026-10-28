import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { placementsRouter } from './routes/placements.js';
import { activitiesRouter } from './routes/activities.js';
import { reportsRouter } from './routes/reports.js';
import { signaturesRouter } from './routes/signatures.js';
import { pdfRouter } from './routes/pdf.js';
import { errorHandler, notFound } from './middleware/error.js';
import { prisma } from './lib/prisma.js';

export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', config.TRUST_PROXY);
app.use(pinoHttp({
  genReqId: req => req.headers['x-request-id'] || crypto.randomUUID(),
  redact: [
    'req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie',
    'req.body.password', 'req.body.currentPassword', 'req.body.newPassword', 'req.body.imageData'
  ]
}));
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
app.use(cors({ origin: config.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: config.REQUEST_BODY_LIMIT }));
app.use(cookieParser());
app.get(['/api/v1/health', '/api/v1/health/live'], (req, res) => {
  res.set('Cache-Control', 'no-store').json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});
app.get('/api/v1/health/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.set('Cache-Control', 'no-store').json({ success: true, data: { status: 'ready', timestamp: new Date().toISOString() } });
  } catch (error) {
    req.log?.error({ err: error }, 'database readiness check failed');
    res.set('Cache-Control', 'no-store').status(503).json({ success: false, data: { status: 'not_ready', timestamp: new Date().toISOString() } });
  }
});
app.use('/api/v1/auth/login', rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/placements', placementsRouter);
app.use('/api/v1/activities', activitiesRouter);
app.use('/api/v1/reports', reportsRouter);
app.use('/api/v1/signatures', signaturesRouter);
app.use('/api/v1', pdfRouter);
app.use(notFound);
app.use(errorHandler);

// Vercel mendeteksi Express dari default export pada entrypoint yang dikenali.
export default app;
