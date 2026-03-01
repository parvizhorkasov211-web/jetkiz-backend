// api/create-courier.js
require("dotenv/config");

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

(async () => {
  const phone = process.argv[2];
  const password = process.argv[3];

  if (!phone || !password) {
    console.log("Usage: node create-courier.js +77070000001 courier001");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { phone },
    update: {
      role: "COURIER",
      passwordHash: hash,
      isActive: true,
      otpCode: null,
      otpExpiresAt: null,
    },
    create: { phone, role: "COURIER", passwordHash: hash, isActive: true },
    select: { id: true, phone: true, role: true },
  });

  await prisma.courierProfile.upsert({
    where: { userId: user.id },
    update: {
      // ничего не ломаем — только гарантируем валидность
      isOnline: false,
    },
    create: {
      userId: user.id,
      firstName: "Courier",
      lastName: "Test",
      iin: "000000000000",
      isOnline: false, // ✅ FIX
    },
  });

  console.log("OK courier:", user);

  await prisma.$disconnect();
  await pool.end();
})().catch(async (e) => {
  console.error(e);
  try {
    await prisma.$disconnect();
  } catch {}
  try {
    await pool.end();
  } catch {}
  process.exit(1);
});