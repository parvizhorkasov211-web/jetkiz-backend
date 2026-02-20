import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

function normalizePhone(input: unknown): string {
  const raw = String(input ?? '').trim();
  let digits = raw.replace(/\D/g, '');

  // Казахстан: 8XXXXXXXXXX -> 7XXXXXXXXXX
  if (digits.length === 11 && digits.startsWith('8')) {
    digits = '7' + digits.slice(1);
  }

  return digits;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');

  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);

  const prisma = new PrismaClient({ adapter });

  try {
    const users = await prisma.user.findMany({ select: { id: true, phone: true } });

    // Проверка конфликтов после нормализации
    const map = new Map<string, { id: string; phone: string }[]>();
    for (const u of users) {
      const norm = normalizePhone(u.phone);
      if (!norm) continue;
      if (!map.has(norm)) map.set(norm, []);
      map.get(norm)!.push({ id: u.id, phone: u.phone });
    }

    const duplicates = [...map.entries()].filter(([, arr]) => arr.length > 1);
    if (duplicates.length) {
      console.log('DUPLICATES AFTER NORMALIZE (resolve manually):');
      for (const [norm, arr] of duplicates) console.log(norm, arr);
      process.exitCode = 2;
      return;
    }

    let updated = 0;
    for (const u of users) {
      const norm = normalizePhone(u.phone);
      if (norm && norm !== u.phone) {
        await prisma.user.update({ where: { id: u.id }, data: { phone: norm } });
        updated++;
      }
    }

    console.log('DONE. updated:', updated);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});