/* eslint-disable no-console */
require('dotenv/config');

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
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
    // ------------------------------------------------------------
    // 1) VIP ресторан + продукты + VIP клиент + заказы + отзывы
    // ------------------------------------------------------------
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

    const category = await prisma.foodCategory.upsert({
      where: { code: 'seed-cat' },
      update: {},
      create: {
        code: 'seed-cat',
        titleRu: 'Seed Категория',
        titleKk: 'Seed Санат',
        sortOrder: 1,
      },
    });

    const titles = ['Seed Бургер', 'Seed Пицца', 'Seed Суши', 'Seed Донер'];
    const products = [];

    for (const titleRu of titles) {
      const p = await prisma.product.create({
        data: {
          restaurantId: restaurant.id,
          categoryId: category.id,
          titleRu,
          titleKk: titleRu,
          descriptionRu: 'Тестовый продукт для seed',
          descriptionKk: 'Seed тест өнімі',
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

    // чистим старые VIP заказы (только VIP)
    const oldOrders = await prisma.order.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    const oldOrderIds = oldOrders.map((o) => o.id);

    if (oldOrderIds.length) {
      await prisma.review.deleteMany({ where: { orderId: { in: oldOrderIds } } });
      await prisma.orderItem.deleteMany({ where: { orderId: { in: oldOrderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: oldOrderIds } } });
    }

    const ordersCount = 12 + randInt(0, 3);
    const now = new Date();
    const hoursPreferred = [12, 13, 14, 18, 19];
    const paymentMethods = ['CARD', 'CASH'];

    const createdOrders = [];

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
        return {
          productId: p.id,
          title: p.titleRu,
          price: p.price,
          quantity,
        };
      });

      const deliveryFee = pick([0, 300, 500, 700]);
      const total = subtotal + deliveryFee;

      const order = await prisma.order.create({
        data: {
          userId: user.id,
          restaurantId: restaurant.id,
          status: 'DELIVERED',
          subtotal,
          deliveryFee,
          total,
          addressId: 'seed-address-id',
          phone: user.phone,
          comment: pick([null, 'Побыстрее пожалуйста', 'Без лука', 'Оставить у двери', 'Позвонить за 5 минут']),
          leaveAtDoor: Math.random() < 0.35,
          paymentMethod: pick(paymentMethods),
          paymentStatus: 'PAID',
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
        },
      });

      await prisma.order.update({
        where: { id: o.id },
        data: { ratingGiven: true },
      });
    }

    // ------------------------------------------------------------
    // 2) Курьеры (3 шт) + активный тариф
    // ------------------------------------------------------------
    const courierPhones = ['+77070000001', '+77070000002', '+77070000003'];
    const courierLogins = [
      { firstName: 'Courier', lastName: '001' },
      { firstName: 'Courier', lastName: '002' },
      { firstName: 'Courier', lastName: '003' },
    ];

    // базовый пароль для курьеров (если у тебя есть /auth/login для COURIER)
    const password = '123456';
    const hash = await bcrypt.hash(password, 10);

    // создаём курьеров как User (role=COURIER)
    const courierUsers = [];
    for (let i = 0; i < courierPhones.length; i++) {
      const phone = courierPhones[i];
      const name = courierLogins[i];

      const u = await prisma.user.upsert({
        where: { phone },
        update: {
          role: 'COURIER',
          firstName: name.firstName,
          lastName: name.lastName,
          // эти поля есть у тебя в проекте (раз компиляция без ошибок)
          passwordHash: hash,
          isActive: true,
        },
        create: {
          phone,
          role: 'COURIER',
          firstName: name.firstName,
          lastName: name.lastName,
          passwordHash: hash,
          isActive: true,
        },
        select: { id: true, phone: true },
      });

      courierUsers.push(u);

      // профиль курьера
      await prisma.courierProfile.upsert({
        where: { userId: u.id },
        update: {
          firstName: name.firstName,
          lastName: name.lastName,
          isOnline: true,
          lastActiveAt: new Date(),
        },
        create: {
          userId: u.id,
          firstName: name.firstName,
          lastName: name.lastName,
          isOnline: true,
          lastActiveAt: new Date(),
        },
      });
    }

    // активный тариф (если нет)
    const tariff = await prisma.courierTariff.findFirst({
      where: { isActive: true },
      select: { id: true },
    });

    if (!tariff) {
      await prisma.courierTariff.create({
        data: {
          title: 'Base Tariff',
          feeFixed: 500,
          feePerOrder: 0,
          isActive: true,
        },
      });
    }

    // ------------------------------------------------------------
    // 3) Привязать ВСЕ заказы ВСЕХ клиентов/ресторанов к этим курьерам
    // ------------------------------------------------------------
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

      const data = {
        courierId: courier.id,
        assignedAt,
        courierFee: typeof o.deliveryFee === 'number' ? o.deliveryFee : 500,
        // “как будто доставили” — если заказ delivered, проставим времена
        pickedUpAt: o.status === 'DELIVERED' ? pickedUpAt : null,
        deliveredAt: o.status === 'DELIVERED' ? deliveredAt : null,
        updatedAt: new Date(),
      };

      await prisma.order.update({
        where: { id: o.id },
        data,
      });

      updated++;
    }

    // обновим “активность” в профиле курьера
    for (const c of courierUsers) {
      await prisma.courierProfile.update({
        where: { userId: c.id },
        data: { lastAssignedAt: new Date(), lastActiveAt: new Date() },
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
