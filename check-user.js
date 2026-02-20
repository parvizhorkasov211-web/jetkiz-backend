const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const phone = process.argv[2];
  const user = await p.user.findFirst({
    where: { phone },
    select: { id: true, phone: true, role: true, passwordHash: true, password: true }
  });
  console.log(user);
  await p.$disconnect();
})();
