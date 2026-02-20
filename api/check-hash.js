require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

(async () => {
  const u = await prisma.user.findUnique({
    where: { phone: "+77070000001" },
    select: { phone: true, role: true, passwordHash: true }
  });
  console.log(u);
  await prisma.$disconnect();
  await pool.end();
})();
