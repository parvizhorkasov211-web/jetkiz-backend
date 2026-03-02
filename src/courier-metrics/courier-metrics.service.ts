import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type JwtUser = { id: string; role?: string };

// ======= helpers для online-timeline (по событиям CourierOnlineEvent) =======
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

function startOfMonth(d: Date) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfYear(d: Date) {
  const x = new Date(d);
  x.setMonth(0, 1);
  x.setHours(0, 0, 0, 0);
  return x;
}
function safeDate(v?: string | null) {
  if (!v) return null;
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return null;
  return d;
}

@Injectable()
export class CourierMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureAdmin(u: JwtUser) {
    if ((u.role ?? 'CLIENT') !== 'ADMIN') throw new ForbiddenException('Only admin');
  }

  /**
   * ✅ Получаем тот же набор курьеров, что в /couriers (роль COURIER + isActive=true)
   */
  private async getCourierUserIdsForMetrics(): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: {
        role: 'COURIER' as any,
        isActive: true,
      } as any,
      select: { id: true },
    });

    return users.map((u) => u.id);
  }

  /**
   * ✅ Completed Orders Count (lifetime или по диапазону)
   * /couriers/metrics/completed-count?courierUserId=...&range=day|month|year
   * /couriers/metrics/completed-count?courierUserId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
   */
  async completedCount(
    user: JwtUser,
    courierUserId: string,
    opts?: { range?: 'day' | 'month' | 'year'; from?: string; to?: string },
  ) {
    this.ensureAdmin(user);

    if (!courierUserId) throw new BadRequestException('courierUserId is required');

    const allowedIds = await this.getCourierUserIdsForMetrics();
    if (!allowedIds.includes(courierUserId)) throw new NotFoundException('Courier not found');

    const now = new Date();

    let fromDate: Date | null = null;
    let toDate: Date | null = null;

    const range = (opts?.range ?? '') as any;

    const parsedFrom = safeDate(opts?.from ?? null);
    const parsedTo = safeDate(opts?.to ?? null);

    if (parsedFrom || parsedTo) {
      // custom period by from/to
      fromDate = parsedFrom;
      toDate = parsedTo ?? now;

      if (!fromDate) throw new BadRequestException('from is required when to is set');
      if (!Number.isFinite(fromDate.getTime()) || !Number.isFinite(toDate.getTime())) {
        throw new BadRequestException('Invalid from/to date');
      }
      if (fromDate.getTime() > toDate.getTime()) {
        throw new BadRequestException('from must be <= to');
      }
    } else if (range === 'day') {
      fromDate = floorToDay(now);
      toDate = now;
    } else if (range === 'month') {
      fromDate = startOfMonth(now);
      toDate = now;
    } else if (range === 'year') {
      fromDate = startOfYear(now);
      toDate = now;
    } else {
      // lifetime: no deliveredAt filter
      fromDate = null;
      toDate = null;
    }

    const where: any = {
      courierId: courierUserId,
      status: 'DELIVERED' as any,
    };

    if (fromDate || toDate) {
      where.deliveredAt = { not: null };
      if (fromDate) where.deliveredAt.gte = fromDate;
      if (toDate) where.deliveredAt.lte = toDate;
    }

    const totalCompleted = await this.prisma.order.count({ where });

    return {
      courierUserId,
      range: range || 'lifetime',
      period:
        fromDate || toDate
          ? {
              from: (fromDate ?? null)?.toISOString?.() ?? null,
              to: (toDate ?? null)?.toISOString?.() ?? null,
            }
          : null,
      totalCompleted,
      generatedAt: now.toISOString(),
    };
  }

  /**
   * ✅ NEW: On-Time Delivery Rate (по SLA минутам)
   * Логика: берём доставленные за период; on-time если deliveredAt <= assignedAt + slaMin
   * /couriers/metrics/on-time-rate?courierUserId=...&from=...&to=...&slaMin=45
   */
  async onTimeRate(
    user: JwtUser,
    courierUserId: string,
    from?: string,
    to?: string,
    slaMin?: number,
  ) {
    this.ensureAdmin(user);

    if (!courierUserId) throw new BadRequestException('courierUserId is required');

    const allowedIds = await this.getCourierUserIdsForMetrics();
    if (!allowedIds.includes(courierUserId)) throw new NotFoundException('Courier not found');

    const now = new Date();
    const toDate = to ? new Date(to) : now;
    const fromDate = from ? new Date(from) : new Date(now.getTime() - 30 * 86400_000);

    if (!Number.isFinite(fromDate.getTime()) || !Number.isFinite(toDate.getTime())) {
      throw new BadRequestException('Invalid from/to date');
    }

    const sla = Math.min(Math.max(Number(slaMin ?? 45), 1), 24 * 60); // 1..1440

    // Берём доставленные за период (по deliveredAt)
    // NOTE: promisedAt НЕ используем — его нет в схеме.
    const delivered = await this.prisma.order.findMany({
      where: {
        courierId: courierUserId,
        status: 'DELIVERED' as any,
        deliveredAt: {
          not: null,
          gte: fromDate,
          lte: toDate,
        },
      } as any,
      select: {
        id: true,
        assignedAt: true,
        deliveredAt: true,
      },
    });

    const totalDelivered = delivered.length;

    // on-time: deliveredAt <= assignedAt + sla
    const slaMs = sla * 60_000;

    let onTimeDelivered = 0;
    for (const o of delivered) {
      const a = o.assignedAt?.getTime();
      const d = o.deliveredAt?.getTime();
      if (!a || !d) continue;
      if (d <= a + slaMs) onTimeDelivered++;
    }

    const ratePct = totalDelivered > 0 ? Math.round((onTimeDelivered / totalDelivered) * 100) : 0;

    return {
      courierUserId,
      period: { from: fromDate.toISOString(), to: toDate.toISOString() },
      slaMin: sla,
      totalDelivered,
      onTimeDelivered,
      ratePct,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * ✅ Summary + items (расширенный realtime)
   */
  async realtime(user: JwtUser) {
    this.ensureAdmin(user);

    const now = new Date();
    const todayFrom = new Date(now);
    todayFrom.setHours(0, 0, 0, 0);

    const allowedIds = await this.getCourierUserIdsForMetrics();

    const couriers = await this.prisma.courierProfile.findMany({
      where: {
        userId: { in: allowedIds },
      },
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
        status: 'DELIVERED' as any,
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
   * ✅ Статусы для диаграммы (3 цвета)
   * GET /couriers/metrics/status-summary
   */
  async statusSummary(user: JwtUser) {
    this.ensureAdmin(user);

    const allowedIds = await this.getCourierUserIdsForMetrics();

    const couriers = await this.prisma.courierProfile.findMany({
      where: {
        userId: { in: allowedIds },
      },
      select: { userId: true, isOnline: true, lastActiveAt: true },
    });

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

    const total = couriers.length;

    const onlineIds = couriers.filter((c) => !!c.isOnline).map((c) => c.userId);
    const offline = couriers.filter((c) => !c.isOnline).length;

    let busy = 0;
    if (onlineIds.length > 0) {
      const activeOrdersByCourier = await this.prisma.order.groupBy({
        by: ['courierId'],
        where: {
          courierId: { in: onlineIds },
          status: { notIn: ['DELIVERED', 'CANCELED'] as any },
        },
        _count: { _all: true },
      });

      busy = activeOrdersByCourier.filter((r) => r.courierId && r._count._all > 0).length;
    }

    const onlineTotal = onlineIds.length;

    const safeBusy = Math.min(busy, onlineTotal);
    const safeOnline = Math.max(onlineTotal - safeBusy, 0);
    const safeOffline = Math.max(total - safeOnline - safeBusy, 0);

    return {
      total,
      online: safeOnline,
      offline: safeOffline,
      busy: safeBusy,
      sleeping: couriers.filter((c) => !c.lastActiveAt || c.lastActiveAt < sevenDaysAgo).length,
      generatedAt: now.toISOString(),
    };
  }

  /**
   * ✅ Список по вкладкам (ONLINE/OFFLINE/BUSY)
   */
  async statusList(user: JwtUser, opts: { tab?: 'ONLINE' | 'OFFLINE' | 'BUSY'; limit?: number }) {
    this.ensureAdmin(user);

    const tab = (opts.tab ?? 'ONLINE') as 'ONLINE' | 'OFFLINE' | 'BUSY';
    const limit = Math.min(Math.max(Number(opts.limit ?? 7), 1), 50);

    const allowedIds = await this.getCourierUserIdsForMetrics();

    const couriers = await this.prisma.courierProfile.findMany({
      where: {
        userId: { in: allowedIds },
      },
      select: {
        userId: true,
        firstName: true,
        lastName: true,
        isOnline: true,
        lastSeenAt: true,
        lastActiveAt: true,
      },
      orderBy: [{ isOnline: 'desc' }, { updatedAt: 'desc' }],
    });

    const onlineIds = couriers.filter((c) => !!c.isOnline).map((c) => c.userId);

    const busySet = new Set<string>();
    if (onlineIds.length > 0) {
      const activeOrdersByCourier = await this.prisma.order.groupBy({
        by: ['courierId'],
        where: {
          courierId: { in: onlineIds },
          status: { notIn: ['DELIVERED', 'CANCELED'] as any },
        },
        _count: { _all: true },
      });

      for (const row of activeOrdersByCourier) {
        if (row.courierId && row._count._all > 0) busySet.add(row.courierId);
      }
    }

    const pickStatus = (c: { userId: string; isOnline: boolean }) => {
      if (!c.isOnline) return 'OFFLINE';
      if (busySet.has(c.userId)) return 'BUSY';
      return 'ONLINE';
    };

    const items = couriers
      .map((c) => ({
        courierUserId: c.userId,
        name: `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || '—',
        tabStatus: pickStatus({ userId: c.userId, isOnline: !!c.isOnline }) as 'ONLINE' | 'OFFLINE' | 'BUSY',
        isOnline: !!c.isOnline,
        lastSeenAt: c.lastSeenAt ? c.lastSeenAt.toISOString() : null,
        lastActiveAt: c.lastActiveAt ? c.lastActiveAt.toISOString() : null,
      }))
      .filter((x) => x.tabStatus === tab)
      .slice(0, limit);

    return { tab, limit, items, generatedAt: new Date().toISOString() };
  }

  async onlineSeries(user: JwtUser, opts: { range?: 'day' | 'week' | 'month'; from?: string; to?: string }) {
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

    const trunc: 'hour' | 'day' = range === 'day' ? 'hour' : 'day';

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
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
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

  async onlineTimeline(user: JwtUser, opts: { from?: string; to?: string; bucket?: 'hour' | 'day' }) {
    this.ensureAdmin(user);

    const now = new Date();
    const toDate = opts.to ? new Date(opts.to) : now;
    const fromDate = opts.from ? new Date(opts.from) : new Date(now.getTime() - 7 * 86400000);

    const bucket: 'hour' | 'day' = opts.bucket === 'day' ? 'day' : 'hour';

    const start = bucket === 'day' ? floorToDay(fromDate) : floorToHour(fromDate);
    const end = bucket === 'day' ? floorToDay(toDate) : floorToHour(toDate);

    const allowedIds = await this.getCourierUserIdsForMetrics();

    const profiles = await this.prisma.courierProfile.findMany({
      where: {
        userId: { in: allowedIds },
      },
      select: { userId: true, isOnline: true },
    });
    const ids = profiles.map((p) => p.userId);

    const state = new Map<string, boolean>();
    for (const p of profiles) state.set(p.userId, !!p.isOnline);

    const lastEvents = await this.prisma.courierOnlineEvent.findMany({
      where: { courierUserId: { in: ids }, at: { lt: start } },
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

    const rangeTo = bucket === 'day' ? addDays(end, 1) : addHours(end, 1);

    const events = await this.prisma.courierOnlineEvent.findMany({
      where: { courierUserId: { in: ids }, at: { gte: start, lt: rangeTo } },
      orderBy: [{ at: 'asc' }],
      select: { courierUserId: true, isOnline: true, at: true },
    });

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

  async byCourier(user: JwtUser, courierUserId: string, from?: string, to?: string) {
    this.ensureAdmin(user);

    const now = new Date();
    const toDate = to ? new Date(to) : now;
    const fromDate = from ? new Date(from) : new Date(now.getTime() - 30 * 86400000);

    const orders = await this.prisma.order.findMany({
      where: { courierId: courierUserId, createdAt: { gte: fromDate, lte: toDate } },
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