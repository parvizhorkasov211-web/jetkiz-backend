import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl || !dbUrl.trim()) {
  throw new Error(
    "DATABASE_URL не найден. Добавь его в api/.env (или в переменные окружения)."
  );
}

// Prisma 7.x: просто создаём клиент, DATABASE_URL берётся из env
const prisma = new PrismaClient();

function rndPhone(i: number) {
  // +7707xxxxxxx (уникальные)
  return `+7707${String(1000000 + i).slice(0, 7)}`;
}

function rndIIN(i: number) {
  // 12 цифр (уникальные)
  return String(900000000000 + i).slice(0, 12);
}

async function main() {
  const seed = [
    { firstName: "Courier", lastName: "Online 1", isOnline: true, isActive: true },
    { firstName: "Courier", lastName: "Online 2", isOnline: true, isActive: true },
    { firstName: "Courier", lastName: "Online 3", isOnline: true, isActive: true },
    { firstName: "Courier", lastName: "Offline 1", isOnline: false, isActive: true },
    { firstName: "Courier", lastName: "Offline 2", isOnline: false, isActive: true },
  ];

  for (let i = 0; i < seed.length; i++) {
    const s = seed[i];

    const phone = rndPhone(i + 1);
    const iin = rndIIN(i + 1);

    // создаём юзера-курьера
    const user = await prisma.user.upsert({
      where: { phone },
      update: {
        role: UserRole.COURIER,
        isActive: s.isActive,
        firstName: s.firstName,
        lastName: s.lastName,
      },
      create: {
        phone,
        role: UserRole.COURIER,
        isActive: s.isActive,
        firstName: s.firstName,
        lastName: s.lastName,
      },
      select: { id: true, phone: true },
    });

    // создаём/обновляем профиль курьера
    await prisma.courierProfile.upsert({
      where: { userId: user.id },
      update: {
        firstName: s.firstName,
        lastName: s.lastName,
        iin,
        isOnline: s.isOnline,
        lastSeenAt: new Date(),
        lastActiveAt: new Date(),
      },
      create: {
        userId: user.id,
        firstName: s.firstName,
        lastName: s.lastName,
        iin,
        isOnline: s.isOnline,
        lastSeenAt: new Date(),
        lastActiveAt: new Date(),
      },
    });

    console.log(
      `✅ ${user.phone} -> ${s.firstName} ${s.lastName} | ${s.isOnline ? "ONLINE" : "OFFLINE"}`
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
