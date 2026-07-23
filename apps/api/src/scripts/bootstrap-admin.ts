import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { validatePassword } from '@matiq/backend';

export async function bootstrapAdmin(db: PrismaClient, emailInput: string, password: string) {
  const email = emailInput.trim().toLowerCase();
  if (!email) throw new Error('BOOTSTRAP_ADMIN_EMAIL is required');
  const errors = validatePassword(password);
  if (errors.length) throw new Error(`Invalid bootstrap password: ${errors.join(', ')}`);
  if (await db.user.count({ where: { role: 'ADMIN', deletedAt: null } })) {
    throw new Error('An active Admin already exists; bootstrap is disabled.');
  }
  return db.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'ADMIN',
      emailVerifiedAt: new Date(),
    },
    select: { id: true, email: true, role: true },
  });
}

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !password)
    throw new Error('BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD are required');
  const db = new PrismaClient();
  try {
    const admin = await bootstrapAdmin(db, email, password);
    console.log(`Created verified ${admin.role} account for ${admin.email} (${admin.id}).`);
  } finally {
    await db.$disconnect();
  }
}

if (process.argv[1]?.endsWith('bootstrap-admin.ts')) void main();
