import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

function normalizePhone(input: unknown): string {
  const raw = String(input ?? '').trim();
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) digits = '7' + digits.slice(1);
  return digits;
}

async function main() {
  const phoneInput = process.argv[2];
  const newPassword = process.argv[3];

  if (!phoneInput || !newPassword) {
    console.log('Usage: npx tsx scripts/reset-admin-password.ts <phone> <newPassword>');
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');

  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const phone = normalizePhone(phoneInput);

    const user = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, phone: true, role: true, isActive: true },
    });

    if (!user) {
      console.log('User not found by phone:', phone);
      process.exit(2);
    }

    if (user.isActive === false) {
      console.log('User is inactive:', { id: user.id, phone: user.phone, role: user.role });
      process.exit(3);
    }

    if (user.role !== UserRole.ADMIN) {
      console.log('Warning: role is not ADMIN:', user.role);
    }

    const hash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hash },
    });

    console.log('OK: password updated for', { id: user.id, phone: user.phone, role: user.role });
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('ERROR:', e);
  process.exit(99);
});