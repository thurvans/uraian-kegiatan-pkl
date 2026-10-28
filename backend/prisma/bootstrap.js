import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';
import { z } from 'zod';

dotenv.config({ path: ['.env.local', '.env'], quiet: true });

function findDatabaseUrl() {
  const env = process.env;
  if (env.DATABASE_URL_UNPOOLED?.trim()) return env.DATABASE_URL_UNPOOLED.trim();
  if (env.POSTGRES_URL_NON_POOLING?.trim()) return env.POSTGRES_URL_NON_POOLING.trim();
  if (env.DATABASE_URL?.trim()) return env.DATABASE_URL.trim();
  if (env.PRISMA_DATABASE_URL?.trim()) return env.PRISMA_DATABASE_URL.trim();
  if (env.POSTGRES_URL?.trim()) return env.POSTGRES_URL.trim();

  const entries = Object.entries(env);
  const unpooled = entries.find(([k, v]) => typeof v === 'string' && v.trim() && (k.endsWith('_DATABASE_URL_UNPOOLED') || k.endsWith('_POSTGRES_URL_NON_POOLING')));
  if (unpooled) return unpooled[1].trim();

  const direct = entries.find(([k, v]) => typeof v === 'string' && v.trim() && (k.endsWith('_DATABASE_URL') || k.endsWith('_PRISMA_DATABASE_URL') || k.endsWith('_POSTGRES_URL')));
  if (direct) return direct[1].trim();

  return '';
}

const databaseUrl = findDatabaseUrl();
if (!process.env.DATABASE_URL && databaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
}

const input = z.object({
  BOOTSTRAP_MENTOR_NAME: z.string().trim().min(2).max(80),
  BOOTSTRAP_MENTOR_EMAIL: z.string().trim().toLowerCase().email(),
  BOOTSTRAP_MENTOR_PASSWORD: z.string().min(12).max(128),
  BOOTSTRAP_INTERN_NAME: z.string().trim().min(2).max(80),
  BOOTSTRAP_INTERN_EMAIL: z.string().trim().toLowerCase().email(),
  BOOTSTRAP_INTERN_PASSWORD: z.string().min(12).max(128),
  BOOTSTRAP_OFFICE_NAME: z.string().trim().min(1).max(200),
  BOOTSTRAP_REGION: z.string().trim().min(1).max(150),
  BOOTSTRAP_DIVISION: z.string().trim().min(1).max(150),
  BOOTSTRAP_POSITION: z.string().trim().min(1).max(100),
  BOOTSTRAP_START_DATE: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  BOOTSTRAP_END_DATE: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
}).parse(process.env);

if (input.BOOTSTRAP_MENTOR_EMAIL === input.BOOTSTRAP_INTERN_EMAIL) {
  throw new Error('Email mentor dan peserta harus berbeda.');
}

const startDate = new Date(`${input.BOOTSTRAP_START_DATE}T00:00:00.000Z`);
const endDate = new Date(`${input.BOOTSTRAP_END_DATE}T00:00:00.000Z`);
if (Number.isNaN(+startDate) || Number.isNaN(+endDate) || endDate < startDate) {
  throw new Error('Periode bootstrap tidak valid.');
}

const prisma = new PrismaClient(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : undefined);
try {
  if (await prisma.user.count()) {
    throw new Error('Bootstrap ditolak karena database sudah memiliki pengguna.');
  }

  const [mentorPasswordHash, internPasswordHash] = await Promise.all([
    bcrypt.hash(input.BOOTSTRAP_MENTOR_PASSWORD, 12),
    bcrypt.hash(input.BOOTSTRAP_INTERN_PASSWORD, 12)
  ]);

  const result = await prisma.$transaction(async tx => {
    const mentor = await tx.user.create({
      data: {
        name: input.BOOTSTRAP_MENTOR_NAME,
        email: input.BOOTSTRAP_MENTOR_EMAIL,
        passwordHash: mentorPasswordHash,
        role: Role.MENTOR
      }
    });
    const intern = await tx.user.create({
      data: {
        name: input.BOOTSTRAP_INTERN_NAME,
        email: input.BOOTSTRAP_INTERN_EMAIL,
        passwordHash: internPasswordHash,
        role: Role.MAGANG
      }
    });
    const placement = await tx.internshipPlacement.create({
      data: {
        mentorId: mentor.id,
        internId: intern.id,
        officeName: input.BOOTSTRAP_OFFICE_NAME,
        region: input.BOOTSTRAP_REGION,
        division: input.BOOTSTRAP_DIVISION,
        position: input.BOOTSTRAP_POSITION,
        startDate,
        endDate
      }
    });
    return { mentor, intern, placement };
  });

  console.log(`Bootstrap selesai: mentor ${result.mentor.email}, peserta ${result.intern.email}, penempatan ${result.placement.id}.`);
} finally {
  await prisma.$disconnect();
}
