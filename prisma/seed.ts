/* eslint-disable no-console */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

type MiniProduct = { id: string; price: number; titleRu: string };

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]) {
  return arr[randInt(0, arr.length - 1)];
}

function genIin(idx: number) {
  // 12 цифр, просто чтобы проходило валидации и было уникально для seed
  const base = 100000000000 + idx;
  return String(base).padStart(12, '0');
}

async function main() {
  console.log('🌱 Seed started...');
  console.log('DATABASE_URL exists:', Boolean(process.env.DATABASE_URL));

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is empty. Проверь api/.env или переменные окружения.');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // 1) VIP ресторан + продукты + VIP клиент + заказы + отзывы
    const restaurant = await prisma.restaurant.upsert({
      where: { slug: 'seed-restaurant-vip' },
      update: {},
      create: {
        slug: 'seed-restaurant-vip',
        nameRu: 'Seed Ресторан VIP',
        nameKk: 'Seed Мейрамхана VIP',
        descriptionRu: 'Тестовый ресторан для VIP клиента',
        descriptionKk: 'VIP клиентке арналған тест мейрамхана',
        status: 'OPEN',
        isPinned: true,
        sortOrder: 1,
        useRandom: false,
      },
    });

    // ✅ FoodCategory теперь принадлежит ресторану:
    // - where: по составному unique ключу restaurantId_code
    // - create: обязательно связываем с restaurant
    const category = await prisma.foodCategory.upsert({
      where: {
        restaurantId_code: {
          restaurantId: restaurant.id,
          code: 'seed-cat',
        },
      },
      update: {},
      create: {
        code: 'seed-cat',
        titleRu: 'Seed Категория',
        titleKk: 'Seed Санат',
        sortOrder: 1,
        restaurant: { connect: { id: restaurant.id } },
      },
    });

    const products: MiniProduct[] = [];
    const titles = ['Seed Бургер', 'Seed Пицца', 'Seed Суши', 'Seed Донер'];

    for (const titleRu of titles) {
      const p = await prisma.product.create({
        data: {
          restaurantId: restaurant.id,
          categoryId: category.id,
          titleRu,
          titleKk: titleRu,
          // ❌ В твоей Prisma модели Product нет descriptionRu/descriptionKk
          price: randInt(1200, 6500),
          isAvailable: true,
        },
        select: { id: true, price: true, titleRu: true },
      });
      products.push(p);
    }

    const phone = '+77009990011';
    const user = await prisma.user.upsert({
      where: { phone },
      update: { firstName: 'VIP', lastName: 'Клиент', email: 'vip.client@seed.local' },
      create: {
        phone,
        role: 'CLIENT',
        firstName: 'VIP',
        lastName: 'Клиент',
        email: 'vip.client@seed.local',
      },
      select: { id: true, phone: true },
    });

    const oldOrders = await prisma.order.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    const oldOrderIds = oldOrders.map((o) => o.id);

    if (oldOrderIds.length) {
      // оставляю как было (у тебя, судя по проекту, Review связан с orderId)
      await prisma.review.deleteMany({ where: { orderId: { in: oldOrderIds } } as any });
      await prisma.orderItem.deleteMany({ where: { orderId: { in: oldOrderIds } } as any });
      await prisma.order.deleteMany({ where: { id: { in: oldOrderIds } } as any });
    }

    const ordersCount = 12 + randInt(0, 3);
    const now = new Date();
    const hoursPreferred = [12, 13, 14, 18, 19];
    const paymentMethods = ['CARD', 'CASH'] as const;

    const createdOrders: { id: string; createdAt: Date; status: any }[] = [];

    for (let i = 0; i < ordersCount; i++) {
      const daysAgo = randInt(0, 45);
      const hour = pick(hoursPreferred);
      const minute = pick([0, 10, 15, 20, 30, 40, 50]);

      const createdAt = new Date(now);
      createdAt.setDate(now.getDate() - daysAgo);
      createdAt.setHours(hour, minute, 0, 0);

      const itemsCount = randInt(1, 3);
      const pickedProducts = Array.from({ length: itemsCount }, () => pick(products));

      let subtotal = 0;
      const itemsData = pickedProducts.map((p) => {
        const quantity = randInt(1, 2);
        subtotal += p.price * quantity;
        return { productId: p.id, title: p.titleRu, price: p.price, quantity };
      });

      const deliveryFee = pick([0, 300, 500, 700]);
      const total = subtotal + deliveryFee;

      const order = await prisma.order.create({
        data: {
          userId: user.id,
          restaurantId: restaurant.id,
          status: 'DELIVERED' as any,
          subtotal,
          deliveryFee,
          total,
          addressId: 'seed-address-id',
          phone: user.phone,
          comment: pick([
            null,
            'Побыстрее пожалуйста',
            'Без лука',
            'Оставить у двери',
            'Позвонить за 5 минут',
          ]),
          leaveAtDoor: Math.random() < 0.35,
          paymentMethod: pick([...paymentMethods]) as any,
          paymentStatus: 'PAID' as any,
          ratingGiven: false,
          createdAt,
          updatedAt: createdAt,
          items: { create: itemsData },
        },
        select: { id: true, createdAt: true, status: true },
      });

      createdOrders.push(order);
    }

    const texts = [
      'Очень вкусно, доставили быстро.',
      'Всё ок, но хотелось бы горячее.',
      'Супер! Буду заказывать ещё.',
      'Курьер вежливый, еда отличная.',
      'Нормально, но порция могла быть больше.',
      'Отличное качество, рекомендую.',
      'Быстро и вкусно!',
    ];

    const reviewsToCreate = Math.min(createdOrders.length, randInt(9, createdOrders.length));
    const reviewOrders = [...createdOrders]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, reviewsToCreate);

    for (const o of reviewOrders) {
      const rating = pick([5, 5, 5, 4, 4, 3]);
      const text = Math.random() < 0.85 ? pick(texts) : null;

      await prisma.review.create({
        data: {
          userId: user.id,
          restaurantId: restaurant.id,
          productId: null,
          orderId: o.id,
          rating,
          text,
          createdAt: new Date(o.createdAt.getTime() + 60 * 60 * 1000),
        } as any,
      });

      await prisma.order.update({ where: { id: o.id }, data: { ratingGiven: true } });
    }

    // 2) Курьеры (3 шт) + тариф
    const courierPhones = ['+77070000001', '+77070000002', '+77070000003'];
    const courierNames = [
      { firstName: 'Courier', lastName: '001' },
      { firstName: 'Courier', lastName: '002' },
      { firstName: 'Courier', lastName: '003' },
    ];

    const password = '123456';
    const hash = await bcrypt.hash(password, 10);

    const courierUsers: { id: string; phone: string }[] = [];

    for (let i = 0; i < courierPhones.length; i++) {
      const phone = courierPhones[i];
      const name = courierNames[i];

      const u = await prisma.user.upsert({
        where: { phone },
        update: {
          role: 'COURIER' as any,
          firstName: name.firstName,
          lastName: name.lastName,
          passwordHash: hash as any,
          isActive: true as any,
        } as any,
        create: {
          phone,
          role: 'COURIER' as any,
          firstName: name.firstName,
          lastName: name.lastName,
          passwordHash: hash as any,
          isActive: true as any,
        } as any,
        select: { id: true, phone: true },
      });

      courierUsers.push(u);

      await prisma.courierProfile.upsert({
        where: { userId: u.id },
        update: {
          firstName: name.firstName,
          lastName: name.lastName,
          isOnline: true as any,
          lastSeenAt: new Date() as any,
          lastActiveAt: new Date() as any,
        } as any,
        create: {
          userId: u.id,
          firstName: name.firstName,
          lastName: name.lastName,
          iin: genIin(i + 1),
          isOnline: true as any,
          lastSeenAt: new Date() as any,
          lastActiveAt: new Date() as any,

          // опциональные поля (чтобы не было сюрпризов)
          personalFeeOverride: null,
          payoutBonusAdd: 0 as any,
          courierCommissionPctOverride: null,
          addressText: null,
          comment: null,
          blockedAt: null,
          blockReason: null,
          lastAssignedAt: null,
        } as any,
      });
    }

    const tariff = await prisma.courierTariff.findFirst({
      where: { isActive: true as any } as any,
      select: { id: true },
    });

    if (!tariff) {
      await prisma.courierTariff.create({
        data: {
          fee: 500,
          isActive: true,
          startsAt: new Date(),
          endsAt: null,
        },
      });
    }

    // 3) Привязать все заказы ко всем курьерам
    const allOrders = await prisma.order.findMany({
      select: { id: true, createdAt: true, status: true, deliveryFee: true },
      orderBy: { createdAt: 'asc' },
    });

    let updated = 0;

    for (let i = 0; i < allOrders.length; i++) {
      const o = allOrders[i];
      const courier = courierUsers[i % courierUsers.length];

      const assignedAt = new Date(o.createdAt.getTime() + 10 * 60 * 1000);
      const pickedUpAt = new Date(o.createdAt.getTime() + 25 * 60 * 1000);
      const deliveredAt = new Date(o.createdAt.getTime() + 45 * 60 * 1000);

      await prisma.order.update({
        where: { id: o.id },
        data: {
          courierId: courier.id as any,
          assignedAt: assignedAt as any,
          courierFee: (typeof o.deliveryFee === 'number' ? o.deliveryFee : 500) as any,
          pickedUpAt: (o.status === ('DELIVERED' as any) ? pickedUpAt : null) as any,
          deliveredAt: (o.status === ('DELIVERED' as any) ? deliveredAt : null) as any,
          updatedAt: new Date(),
        } as any,
      });

      updated++;
    }

    for (const c of courierUsers) {
      await prisma.courierProfile.update({
        where: { userId: c.id },
        data: { lastAssignedAt: new Date() as any, lastActiveAt: new Date() as any } as any,
      });
    }

    console.log('✅ Seed done!');
    console.log('VIP user phone:', user.phone);
    console.log('VIP user id:', user.id);
    console.log('VIP Orders created:', createdOrders.length);
    console.log('Couriers created:', courierUsers.length);
    console.log(`✅ Orders attached to couriers: ${updated}`);
    console.log('Logins:');
    console.log('+77070000001 / 123456');
    console.log('+77070000002 / 123456');
    console.log('+77070000003 / 123456');
  } finally {
    await prisma.$disconnect().catch(() => {});
    await pool.end().catch(() => {});
  }
}

main().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});