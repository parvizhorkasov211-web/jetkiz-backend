require("dotenv/config");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");

(async () => {
  const phone = process.env.ADMIN_PHONE;
  const password = process.env.ADMIN_PASSWORD;

  if (!phone) throw new Error("Missing ADMIN_PHONE env var");
  if (!password) throw new Error("Missing ADMIN_PASSWORD env var");
  if (!process.env.DATABASE_URL) throw new Error("Missing DATABASE_URL env var");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const u = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, phone: true, role: true, isActive: true, passwordHash: true },
    });

    if (!u) {
      console.log("NO USER");
      return;
    }
    console.log("USER:", { id: u.id, phone: u.phone, role: u.role, isActive: u.isActive, hasHash: !!u.passwordHash });

    if (!u.passwordHash) {
      console.log("NO HASH");
      return;
    }

    const ok = await bcrypt.compare(password, u.passwordHash);
    console.log("COMPARE_OK =", ok);
  } finally {
    await prisma.$disconnect().catch(() => {});
    await pool.end().catch(() => {});
  }
})().catch((e) => {
  console.error("CHECK ERROR:", e);
  process.exit(1);
});
