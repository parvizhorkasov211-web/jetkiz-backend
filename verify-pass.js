require("dotenv/config");

const bcryptjs = require("bcryptjs");
let bcrypt;
try { bcrypt = require("bcrypt"); } catch { bcrypt = null; }

const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

(async () => {
  const phone = "+77070000001";
  const pass = "courier001";

  const u = await prisma.user.findUnique({
    where: { phone },
    select: { phone: true, role: true, passwordHash: true }
  });

  console.log("User:", { phone: u?.phone, role: u?.role });
  console.log("Hash:", u?.passwordHash);

  const okJs = await bcryptjs.compare(pass, u.passwordHash);
  console.log("bcryptjs.compare =", okJs);

  if (bcrypt) {
    const ok = await bcrypt.compare(pass, u.passwordHash);
    console.log("bcrypt.compare   =", ok);
  } else {
    console.log("bcrypt not installed");
  }

  await prisma.$disconnect();
  await pool.end();
})();
