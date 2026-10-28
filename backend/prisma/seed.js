import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

dotenv.config({ path: ['.env.local', '.env'], quiet: true });

if (process.env.NODE_ENV === 'production') {
  throw new Error('Seed demo tidak boleh dijalankan dengan NODE_ENV=production.');
}

const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL ||
  process.env.PRISMA_DATABASE_URL ||
  process.env.POSTGRES_URL;

if (!process.env.DATABASE_URL && databaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
}

const prisma = new PrismaClient(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : undefined);
const passwordHash = await bcrypt.hash('Password123!', 12);

await prisma.user.upsert({
  where: { email: 'mentor@pkl.local' },
  update: {},
  create: { name: 'Erwin', email: 'mentor@pkl.local', passwordHash, role: Role.MENTOR }
});
await prisma.user.upsert({
  where: { email: 'magang@pkl.local' },
  update: {},
  create: { name: 'Fathur Risansyah', email: 'magang@pkl.local', passwordHash, role: Role.MAGANG }
});
await prisma.user.upsert({
  where: { email: 'magang2@pkl.local' },
  update: { name: 'Iqro Mukti Arto', passwordHash, role: Role.MAGANG, isActive: true },
  create: { name: 'Iqro Mukti Arto', email: 'magang2@pkl.local', passwordHash, role: Role.MAGANG }
});
console.log('Seed akun selesai.');
console.log('Login: magang@pkl.local, magang2@pkl.local, atau mentor@pkl.local - Password123!');
await prisma.$disconnect();
