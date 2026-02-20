require("dotenv/config");

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");

(async () => {
  const phone = process.env.ADMIN_PHONE;
  const password = process.env.ADMIN_PASSWORD;

  if (!phone) throw new Error("Missing ADMIN_PHONE env var.");
  if (!password) throw new Error("Missing ADMIN_PASSWORD env var.");
  if (!process.env.DATABASE_URL) throw new Error("Missing DATABASE_URL in env.");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
      where: { phone },
      update: { role: "ADMIN", passwordHash: hash, isActive: true, otpCode: null, otpExpiresAt: null },
      create: { phone, role: "ADMIN", passwordHash: hash, isActive: true },
      select: { id: true, phone: true, role: true, isActive: true },
    });

    console.log("OK admin:", user);
  } finally {
    await prisma.$disconnect().catch(() => {});
    await pool.end().catch(() => {});
  }
})().catch((e) => {
  console.error("CREATE ADMIN ERROR:", e);
  process.exit(1);
});
