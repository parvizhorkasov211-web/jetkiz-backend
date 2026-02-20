require("dotenv/config");

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

(async () => {
  const phone = process.argv[2];
  const password = process.argv[3];

  const hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { phone },
    update: { role: "ADMIN", passwordHash: hash, isActive: true, otpCode: null, otpExpiresAt: null },
    create: { phone, role: "ADMIN", passwordHash: hash, isActive: true },
    select: { id: true, phone: true, role: true }
  });

  console.log("OK admin:", user);

  await prisma.$disconnect();
  await pool.end();
})().catch(async (e) => {
  console.error(e);
  try { await prisma.$disconnect(); } catch {}
  try { await pool.end(); } catch {}
  process.exit(1);
});
