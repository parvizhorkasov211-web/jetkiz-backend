import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type JwtUser = { id: string; role?: string };

// ======= ДОБАВЛЕНО: helpers для online-timeline (по событиям CourierOnlineEvent) =======
function floorToHour(d: Date) {
  const x = new Date(d);
  x.setMinutes(0, 0, 0);
  return x;
}
function floorToDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addHours(d: Date, h: number) {
  return new Date(d.getTime() + h * 3600_000);
}
function addDays(d: Date, days: number) {
  return new Date(d.getTime() + days * 86400_000);
}
// ==============================================================================

@Injectable()
export class CourierMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureAdmin(u: JwtUser) {
    if ((u.role ?? 'CLIENT') !== 'ADMIN') throw new ForbiddenException('Only admin');
  }

  async realtime(user: JwtUser) {
    this.ensureAdmin(user);

    const now = new Date();
    const todayFrom = new Date(now);
    todayFrom.setHours(0, 0, 0, 0);

    const couriers = await this.prisma.courierProfile.findMany({
      select: {
        userId: true,
        firstName: true,
        lastName: true,
        isOnline: true,
        lastSeenAt: true,
        lastActiveAt: true,
        personalFeeOverride: true,
      },
      orderBy: [{ isOnline: 'desc' }, { updatedAt: 'desc' }],
    });

    const ids = couriers.map((c) => c.userId);

    const activeOrders = await this.prisma.order.groupBy({
      by: ['courierId', 'status'],
      where: {
        courierId: { in: ids },
        status: { notIn: ['DELIVERED', 'CANCELED'] as any },
      },
      _count: { _all: true },
    });

    const todayDelivered = await this.prisma.order.groupBy({
      by: ['courierId'],
      where: {
        courierId: { in: ids },
        status: 'DELIVERED',
        deliveredAt: { gte: todayFrom },
      },
      _count: { _all: true },
      _sum: { courierFee: true },
    });

    const activeMap = new Map<string, Record<string, number>>();
    for (const a of activeOrders) {
      if (!a.courierId) continue;
      const cur = activeMap.get(a.courierId) ?? {};
      cur[String(a.status)] = a._count._all;
      activeMap.set(a.courierId, cur);
    }

    const todayMap = new Map<string, { delivered: number; earned: number }>();
    for (const t of todayDelivered) {
      if (!t.courierId) continue;
      todayMap.set(t.courierId, {
        delivered: t._count._all,
        earned: Number(t._sum.courierFee ?? 0),
      });
    }

    // sleepers: not active 7 days (config later)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

    const items = couriers.map((c) => {
      const active = activeMap.get(c.userId) ?? {};
      const today = todayMap.get(c.userId) ?? { delivered: 0, earned: 0 };
      const sleeping = !c.lastActiveAt || c.lastActiveAt < sevenDaysAgo;

      return {
        courierUserId: c.userId,
        name: `${c.firstName} ${c.lastName}`.trim(),
        isOnline: c.isOnline,
        lastSeenAt: c.lastSeenAt ? c.lastSeenAt.toISOString() : null,
        lastActiveAt: c.lastActiveAt ? c.lastActiveAt.toISOString() : null,
        sleeping,
        activeOrdersByStatus: active,
        todayDelivered: today.delivered,
        todayEarned: today.earned,
      };
    });

    const summary = {
      totalCouriers: couriers.length,
      online: couriers.filter((c) => c.isOnline).length,
      sleeping: items.filter((x) => x.sleeping).length,
      activeOrders: activeOrders.reduce((acc, x) => acc + x._count._all, 0),
    };

    return { summary, items, generatedAt: now.toISOString() };
  }

  /**
   * ✅ Онлайн по времени — БЕЗ миграций.
   * Используем существующие поля CourierProfile:
   * - lastSeenAt   -> "курьер был виден/онлайн (пинг) в это время"
   * - lastActiveAt -> "курьер реально активничал (заказ/движение) в это время"
   *
   * Важно: это НЕ идеальная "история включения/выключения", но уже даёт картину:
   * - когда обычно много курьеров на линии
   * - когда провалы (нужно стимулировать/планировать смены)
   */
  async onlineSeries(
    user: JwtUser,
    opts: { range?: 'day' | 'week' | 'month'; from?: string; to?: string },
  ) {
    this.ensureAdmin(user);

    const range = (opts.range ?? 'day') as 'day' | 'week' | 'month';
    const now = new Date();
    const toDate = opts.to ? new Date(opts.to) : now;

    let fromDate: Date;
    if (opts.from) fromDate = new Date(opts.from);
    else {
      const days = range === 'day' ? 1 : range === 'week' ? 7 : 30;
      fromDate = new Date(toDate.getTime() - days * 86400000);
    }

    // bucket: hour for day, day for week/month
    const trunc: 'hour' | 'day' = range === 'day' ? 'hour' : 'day';

    // seen (lastSeenAt)
    const seenRows = (await this.prisma.$queryRawUnsafe<any[]>(
      `
      SELECT
        date_trunc('${trunc}', "lastSeenAt") AS bucket,
        COUNT(DISTINCT "userId")::int AS seen_unique
      FROM "CourierProfile"
      WHERE "lastSeenAt" IS NOT NULL
        AND "lastSeenAt" >= $1
        AND "lastSeenAt" <= $2
      GROUP BY bucket
      ORDER BY bucket ASC
      `,
      fromDate,
      toDate,
    )) as any[];

    // active (lastActiveAt)
    const activeRows = (await this.prisma.$queryRawUnsafe<any[]>(
      `
      SELECT
        date_trunc('${trunc}', "lastActiveAt") AS bucket,
        COUNT(DISTINCT "userId")::int AS active_unique
      FROM "CourierProfile"
      WHERE "lastActiveAt" IS NOT NULL
        AND "lastActiveAt" >= $1
        AND "lastActiveAt" <= $2
      GROUP BY bucket
      ORDER BY bucket ASC
      `,
      fromDate,
      toDate,
    )) as any[];

    // merge buckets
    const map = new Map<string, { seenUnique: number; activeUnique: number }>();

    for (const r of seenRows) {
      const k = new Date(r.bucket).toISOString();
      map.set(k, { seenUnique: Number(r.seen_unique ?? 0), activeUnique: 0 });
    }
    for (const r of activeRows) {
      const k = new Date(r.bucket).toISOString();
      const cur = map.get(k) ?? { seenUnique: 0, activeUnique: 0 };
      cur.activeUnique = Number(r.active_unique ?? 0);
      map.set(k, cur);
    }

    const series = Array.from(map.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(a[0]).getTime())
      .map(([bucket, v]) => ({
        bucket,
        seenUnique: v.seenUnique,
        activeUnique: v.activeUnique,
      }));

    return {
      range,
      bucket: trunc,
      period: { from: fromDate.toISOString(), to: toDate.toISOString() },
      series,
    };
  }

  // ===================== ДОБАВЛЕНО: идеальная метрика "онлайн по времени" по событиям =====================
  /**
   * ✅ Метрика: "Онлайн курьеры по времени" (по CourierOnlineEvent)
   *
   * /couriers/metrics/online-timeline?from=...&to=...&bucket=hour|day
   *
   * Возвращает:
   * points: [{ ts, online }]
   *
   * Работает так:
   * - берём текущее состояние из CourierProfile как базу
   * - на момент start пересчитываем состояние последними событиями ДО start
   * - дальше по событиям меняем onlineCount и пишем значения по бакетам
   *
   * Важно: В модели CourierOnlineEvent время хранится в поле `at`, не `createdAt`.
   */
 async onlineTimeline(
  user: JwtUser,
  opts: { from?: string; to?: string; bucket?: 'hour' | 'day' },
) {
  this.ensureAdmin(user);

  const now = new Date();
  const toDate = opts.to ? new Date(opts.to) : now;
  const fromDate = opts.from ? new Date(opts.from) : new Date(now.getTime() - 7 * 86400000);

  const bucket: 'hour' | 'day' = opts.bucket === 'day' ? 'day' : 'hour';

  const start = bucket === 'day' ? floorToDay(fromDate) : floorToHour(fromDate);
  const end = bucket === 'day' ? floorToDay(toDate) : floorToHour(toDate);

  // 1) init state from profiles
  const profiles = await this.prisma.courierProfile.findMany({
    select: { userId: true, isOnline: true },
  });
  const ids = profiles.map((p) => p.userId);

  const state = new Map<string, boolean>();
  for (const p of profiles) state.set(p.userId, !!p.isOnline);

  // 2) apply last event before start (per courier)
  // ВАЖНО: поле времени в CourierOnlineEvent = `at`
  const lastEvents = await this.prisma.courierOnlineEvent.findMany({
    where: {
      courierUserId: { in: ids },
      at: { lt: start },
    },
    orderBy: [{ courierUserId: 'asc' }, { at: 'desc' }],
    select: { courierUserId: true, isOnline: true, at: true },
  });

  const seen = new Set<string>();
  for (const e of lastEvents) {
    if (seen.has(e.courierUserId)) continue;
    seen.add(e.courierUserId);
    state.set(e.courierUserId, !!e.isOnline);
  }

  let onlineCount = 0;
  for (const v of state.values()) if (v) onlineCount++;

  // 3) events in range [start, end+1bucket)
  const rangeTo = bucket === 'day' ? addDays(end, 1) : addHours(end, 1);

  const events = await this.prisma.courierOnlineEvent.findMany({
    where: {
      courierUserId: { in: ids },
      at: { gte: start, lt: rangeTo },
    },
    orderBy: [{ at: 'asc' }],
    select: { courierUserId: true, isOnline: true, at: true },
  });

  // 4) buckets
  const points: Array<{ ts: string; online: number }> = [];

  let cursor = new Date(start);
  let next = bucket === 'day' ? addDays(cursor, 1) : addHours(cursor, 1);

  let i = 0;
  while (cursor.getTime() <= end.getTime()) {
    while (i < events.length) {
      const ev = events[i];
      const t = ev.at.getTime();

      if (t < cursor.getTime()) {
        i++;
        continue;
      }
      if (t >= next.getTime()) break;

      const prev = state.get(ev.courierUserId) ?? false;
      const cur = !!ev.isOnline;

      if (prev !== cur) {
        state.set(ev.courierUserId, cur);
        onlineCount += cur ? 1 : -1;
      }

      i++;
    }

    points.push({ ts: cursor.toISOString(), online: onlineCount });

    cursor = next;
    next = bucket === 'day' ? addDays(cursor, 1) : addHours(cursor, 1);
  }

  return {
    period: { from: start.toISOString(), to: toDate.toISOString() },
    bucket,
    points,
    generatedAt: now.toISOString(),
  };
}
  // =========================================================================================================

  async byCourier(user: JwtUser, courierUserId: string, from?: string, to?: string) {
    this.ensureAdmin(user);

    const now = new Date();
    const toDate = to ? new Date(to) : now;
    const fromDate = from ? new Date(from) : new Date(now.getTime() - 30 * 86400000);

    // delivered / canceled / avg time etc
    const orders = await this.prisma.order.findMany({
      where: {
        courierId: courierUserId,
        createdAt: { gte: fromDate, lte: toDate },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        assignedAt: true,
        pickedUpAt: true,
        deliveredAt: true,
        courierFee: true,
        total: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const delivered = orders.filter((o) => o.status === 'DELIVERED');
    const canceled = orders.filter((o) => o.status === 'CANCELED');
    const active = orders.filter((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELED');

    const sumEarned = delivered.reduce((s, o) => s + Number(o.courierFee ?? 0), 0);

    const durations = delivered
      .map((o) => {
        const a = o.assignedAt?.getTime();
        const d = o.deliveredAt?.getTime();
        if (!a || !d || d <= a) return null;
        return Math.round((d - a) / 60000);
      })
      .filter((x): x is number => x != null);

    const avgDeliveryMin = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

    return {
      courierUserId,
      period: { from: fromDate.toISOString(), to: toDate.toISOString() },
      totals: {
        orders: orders.length,
        delivered: delivered.length,
        canceled: canceled.length,
        active: active.length,
        earned: sumEarned,
        avgDeliveryMin,
      },
      recent: orders.slice(0, 50).map((o) => ({
        id: o.id,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
        assignedAt: o.assignedAt ? o.assignedAt.toISOString() : null,
        deliveredAt: o.deliveredAt ? o.deliveredAt.toISOString() : null,
        courierFee: o.courierFee,
        orderTotal: o.total,
      })),
    };
  }
}