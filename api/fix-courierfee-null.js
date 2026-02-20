const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const res = await prisma.order.updateMany({
    where: { courierFee: null },
    data: { courierFee: 0 },
  });

  console.log("Updated rows:", res.count);
  await prisma.$disconnect();
})();
