import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

dotenv.config({ path: ['.env.local', '.env'], quiet: true });

if (process.env.NODE_ENV === 'production') {
  throw new Error('Seed demo tidak boleh dijalankan dengan NODE_ENV=production.');
}

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

const prisma = new PrismaClient(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : undefined);
const passwordHash = await bcrypt.hash('Password123!', 12);

const mentor = await prisma.user.upsert({
  where: { email: 'mentor@pkl.local' },
  update: {},
  create: { name: 'Erwin', email: 'mentor@pkl.local', passwordHash, role: Role.MENTOR }
});
const magang = await prisma.user.upsert({
  where: { email: 'magang@pkl.local' },
  update: {},
  create: { name: 'Fathur Risansyah', email: 'magang@pkl.local', passwordHash, role: Role.MAGANG }
});
const magang2 = await prisma.user.upsert({
  where: { email: 'magang2@pkl.local' },
  update: { name: 'Iqro Mukti Arto', passwordHash, role: Role.MAGANG, isActive: true },
  create: { name: 'Iqro Mukti Arto', email: 'magang2@pkl.local', passwordHash, role: Role.MAGANG }
});

const today = new Date();
const startDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
const endDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 3, 0));

const placement1 = await prisma.internshipPlacement.findFirst({ where: { internId: magang.id } });
if (!placement1) {
  await prisma.internshipPlacement.create({
    data: {
      internId: magang.id,
      mentorId: mentor.id,
      officeName: 'PT Teknologi Digital Indonesia',
      region: 'Jakarta Selatan',
      division: 'Software Engineering',
      position: 'Frontend Developer Intern',
      startDate,
      endDate
    }
  });
}

const placement2 = await prisma.internshipPlacement.findFirst({ where: { internId: magang2.id } });
if (!placement2) {
  await prisma.internshipPlacement.create({
    data: {
      internId: magang2.id,
      mentorId: mentor.id,
      officeName: 'PT Teknologi Digital Indonesia',
      region: 'Jakarta Selatan',
      division: 'Software Engineering',
      position: 'Backend Developer Intern',
      startDate,
      endDate
    }
  });
}

console.log('Seed akun & penempatan selesai.');
console.log('Login: magang@pkl.local, magang2@pkl.local, atau mentor@pkl.local - Password123!');
await prisma.$disconnect();
