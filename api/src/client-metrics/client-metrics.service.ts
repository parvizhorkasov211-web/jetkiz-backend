import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type JwtUser = { id: string; role?: string };

function startOfHour(d: Date) {
  const x = new Date(d);
  x.setMinutes(0, 0, 0);
  return x;
}

function startOfDay(d: Date) {
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

@Injectable()
export class ClientMetricsService {
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
   * ✅ Онлайн по времени (события CourierOnlineEvent)
   * /client-metrics/online-timeline?range=day|week|month&from=...&to=...
   */
  async onlineTimeline(
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

    const bucket: 'hour' | 'day' = range === 'day' ? 'hour' : 'day';
    const start = bucket === 'hour' ? startOfHour(fromDate) : startOfDay(fromDate);
    const end = bucket === 'hour' ? startOfHour(toDate) : startOfDay(toDate);

    const couriers = await this.prisma.courierProfile.findMany({
      select: { userId: true },
    });
    const ids = couriers.map((c) => c.userId);

    const state = new Map<string, boolean>();
    for (const id of ids) state.set(id, false);

    // последнее событие ДО старта, поле времени = at
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

    const countOnline = () => {
      let n = 0;
      for (const v of state.values()) if (v) n++;
      return n;
    };

    const rangeTo = bucket === 'hour' ? addHours(end, 1) : addDays(end, 1);

    const events = await this.prisma.courierOnlineEvent.findMany({
      where: {
        courierUserId: { in: ids },
        at: { gte: start, lt: rangeTo },
      },
      orderBy: [{ at: 'asc' }],
      select: { courierUserId: true, isOnline: true, at: true },
    });

    const series: Array<{ bucket: string; onlineCount: number }> = [];

    let cursor = new Date(start);
    let next = bucket === 'hour' ? addHours(cursor, 1) : addDays(cursor, 1);

    let i = 0;
    while (cursor <= end) {
      while (i < events.length) {
        const ev = events[i];
        const t = ev.at.getTime();
        if (t < cursor.getTime()) {
          i++;
          continue;
        }
        if (t >= next.getTime()) break;

        state.set(ev.courierUserId, !!ev.isOnline);
        i++;
      }

      series.push({
        bucket: cursor.toISOString(),
        onlineCount: countOnline(),
      });

      cursor = next;
      next = bucket === 'hour' ? addHours(cursor, 1) : addDays(cursor, 1);
    }

    return {
      range,
      bucket,
      period: { from: start.toISOString(), to: end.toISOString() },
      series,
      generatedAt: now.toISOString(),
    };
  }

  async byCourier(user: JwtUser, courierUserId: string, from?: string, to?: string) {
    this.ensureAdmin(user);

    const now = new Date();
    const toDate = to ? new Date(to) : now;
    const fromDate = from ? new Date(from) : new Date(now.getTime() - 30 * 86400000);

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