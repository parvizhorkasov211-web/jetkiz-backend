"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourierMetricsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
function floorToHour(d) {
    const x = new Date(d);
    x.setMinutes(0, 0, 0);
    return x;
}
function floorToDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}
function addHours(d, h) {
    return new Date(d.getTime() + h * 3600_000);
}
function addDays(d, days) {
    return new Date(d.getTime() + days * 86400_000);
}
function startOfMonth(d) {
    const x = new Date(d);
    x.setDate(1);
    x.setHours(0, 0, 0, 0);
    return x;
}
function startOfYear(d) {
    const x = new Date(d);
    x.setMonth(0, 1);
    x.setHours(0, 0, 0, 0);
    return x;
}
function safeDate(v) {
    if (!v)
        return null;
    const d = new Date(v);
    if (!Number.isFinite(d.getTime()))
        return null;
    return d;
}
let CourierMetricsService = class CourierMetricsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    ensureAdmin(u) {
        if ((u.role ?? 'CLIENT') !== 'ADMIN')
            throw new common_1.ForbiddenException('Only admin');
    }
    async getCourierUserIdsForMetrics() {
        const users = await this.prisma.user.findMany({
            where: {
                role: 'COURIER',
                isActive: true,
            },
            select: { id: true },
        });
        return users.map((u) => u.id);
    }
    async completedCount(user, courierUserId, opts) {
        this.ensureAdmin(user);
        if (!courierUserId)
            throw new common_1.BadRequestException('courierUserId is required');
        const allowedIds = await this.getCourierUserIdsForMetrics();
        if (!allowedIds.includes(courierUserId))
            throw new common_1.NotFoundException('Courier not found');
        const now = new Date();
        let fromDate = null;
        let toDate = null;
        const range = (opts?.range ?? '');
        const parsedFrom = safeDate(opts?.from ?? null);
        const parsedTo = safeDate(opts?.to ?? null);
        if (parsedFrom || parsedTo) {
            fromDate = parsedFrom;
            toDate = parsedTo ?? now;
            if (!fromDate)
                throw new common_1.BadRequestException('from is required when to is set');
            if (!Number.isFinite(fromDate.getTime()) || !Number.isFinite(toDate.getTime())) {
                throw new common_1.BadRequestException('Invalid from/to date');
            }
            if (fromDate.getTime() > toDate.getTime()) {
                throw new common_1.BadRequestException('from must be <= to');
            }
        }
        else if (range === 'day') {
            fromDate = floorToDay(now);
            toDate = now;
        }
        else if (range === 'month') {
            fromDate = startOfMonth(now);
            toDate = now;
        }
        else if (range === 'year') {
            fromDate = startOfYear(now);
            toDate = now;
        }
        else {
            fromDate = null;
            toDate = null;
        }
        const where = {
            courierId: courierUserId,
            status: 'DELIVERED',
        };
        if (fromDate || toDate) {
            where.deliveredAt = { not: null };
            if (fromDate)
                where.deliveredAt.gte = fromDate;
            if (toDate)
                where.deliveredAt.lte = toDate;
        }
        const totalCompleted = await this.prisma.order.count({ where });
        return {
            courierUserId,
            range: range || 'lifetime',
            period: fromDate || toDate
                ? {
                    from: (fromDate ?? null)?.toISOString?.() ?? null,
                    to: (toDate ?? null)?.toISOString?.() ?? null,
                }
                : null,
            totalCompleted,
            generatedAt: now.toISOString(),
        };
    }
    async onTimeRate(user, courierUserId, from, to, slaMin) {
        this.ensureAdmin(user);
        if (!courierUserId)
            throw new common_1.BadRequestException('courierUserId is required');
        const allowedIds = await this.getCourierUserIdsForMetrics();
        if (!allowedIds.includes(courierUserId))
            throw new common_1.NotFoundException('Courier not found');
        const now = new Date();
        const toDate = to ? new Date(to) : now;
        const fromDate = from ? new Date(from) : new Date(now.getTime() - 30 * 86400_000);
        if (!Number.isFinite(fromDate.getTime()) || !Number.isFinite(toDate.getTime())) {
            throw new common_1.BadRequestException('Invalid from/to date');
        }
        const sla = Math.min(Math.max(Number(slaMin ?? 45), 1), 24 * 60);
        const delivered = await this.prisma.order.findMany({
            where: {
                courierId: courierUserId,
                status: 'DELIVERED',
                deliveredAt: {
                    not: null,
                    gte: fromDate,
                    lte: toDate,
                },
            },
            select: {
                id: true,
                assignedAt: true,
                deliveredAt: true,
            },
        });
        const totalDelivered = delivered.length;
        const slaMs = sla * 60_000;
        let onTimeDelivered = 0;
        for (const o of delivered) {
            const a = o.assignedAt?.getTime();
            const d = o.deliveredAt?.getTime();
            if (!a || !d)
                continue;
            if (d <= a + slaMs)
                onTimeDelivered++;
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
    async realtime(user) {
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
                status: { notIn: ['DELIVERED', 'CANCELED'] },
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
        const activeMap = new Map();
        for (const a of activeOrders) {
            if (!a.courierId)
                continue;
            const cur = activeMap.get(a.courierId) ?? {};
            cur[String(a.status)] = a._count._all;
            activeMap.set(a.courierId, cur);
        }
        const todayMap = new Map();
        for (const t of todayDelivered) {
            if (!t.courierId)
                continue;
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
    async statusSummary(user) {
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
                    status: { notIn: ['DELIVERED', 'CANCELED'] },
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
    async statusList(user, opts) {
        this.ensureAdmin(user);
        const tab = (opts.tab ?? 'ONLINE');
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
        const busySet = new Set();
        if (onlineIds.length > 0) {
            const activeOrdersByCourier = await this.prisma.order.groupBy({
                by: ['courierId'],
                where: {
                    courierId: { in: onlineIds },
                    status: { notIn: ['DELIVERED', 'CANCELED'] },
                },
                _count: { _all: true },
            });
            for (const row of activeOrdersByCourier) {
                if (row.courierId && row._count._all > 0)
                    busySet.add(row.courierId);
            }
        }
        const pickStatus = (c) => {
            if (!c.isOnline)
                return 'OFFLINE';
            if (busySet.has(c.userId))
                return 'BUSY';
            return 'ONLINE';
        };
        const items = couriers
            .map((c) => ({
            courierUserId: c.userId,
            name: `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || '—',
            tabStatus: pickStatus({ userId: c.userId, isOnline: !!c.isOnline }),
            isOnline: !!c.isOnline,
            lastSeenAt: c.lastSeenAt ? c.lastSeenAt.toISOString() : null,
            lastActiveAt: c.lastActiveAt ? c.lastActiveAt.toISOString() : null,
        }))
            .filter((x) => x.tabStatus === tab)
            .slice(0, limit);
        return { tab, limit, items, generatedAt: new Date().toISOString() };
    }
    async onlineSeries(user, opts) {
        this.ensureAdmin(user);
        const range = (opts.range ?? 'day');
        const now = new Date();
        const toDate = opts.to ? new Date(opts.to) : now;
        let fromDate;
        if (opts.from)
            fromDate = new Date(opts.from);
        else {
            const days = range === 'day' ? 1 : range === 'week' ? 7 : 30;
            fromDate = new Date(toDate.getTime() - days * 86400000);
        }
        const trunc = range === 'day' ? 'hour' : 'day';
        const seenRows = (await this.prisma.$queryRawUnsafe(`
      SELECT
        date_trunc('${trunc}', "lastSeenAt") AS bucket,
        COUNT(DISTINCT "userId")::int AS seen_unique
      FROM "CourierProfile"
      WHERE "lastSeenAt" IS NOT NULL
        AND "lastSeenAt" >= $1
        AND "lastSeenAt" <= $2
      GROUP BY bucket
      ORDER BY bucket ASC
      `, fromDate, toDate));
        const activeRows = (await this.prisma.$queryRawUnsafe(`
      SELECT
        date_trunc('${trunc}', "lastActiveAt") AS bucket,
        COUNT(DISTINCT "userId")::int AS active_unique
      FROM "CourierProfile"
      WHERE "lastActiveAt" IS NOT NULL
        AND "lastActiveAt" >= $1
        AND "lastActiveAt" <= $2
      GROUP BY bucket
      ORDER BY bucket ASC
      `, fromDate, toDate));
        const map = new Map();
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
    async onlineTimeline(user, opts) {
        this.ensureAdmin(user);
        const now = new Date();
        const toDate = opts.to ? new Date(opts.to) : now;
        const fromDate = opts.from ? new Date(opts.from) : new Date(now.getTime() - 7 * 86400000);
        const bucket = opts.bucket === 'day' ? 'day' : 'hour';
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
        const state = new Map();
        for (const p of profiles)
            state.set(p.userId, !!p.isOnline);
        const lastEvents = await this.prisma.courierOnlineEvent.findMany({
            where: { courierUserId: { in: ids }, at: { lt: start } },
            orderBy: [{ courierUserId: 'asc' }, { at: 'desc' }],
            select: { courierUserId: true, isOnline: true, at: true },
        });
        const seen = new Set();
        for (const e of lastEvents) {
            if (seen.has(e.courierUserId))
                continue;
            seen.add(e.courierUserId);
            state.set(e.courierUserId, !!e.isOnline);
        }
        let onlineCount = 0;
        for (const v of state.values())
            if (v)
                onlineCount++;
        const rangeTo = bucket === 'day' ? addDays(end, 1) : addHours(end, 1);
        const events = await this.prisma.courierOnlineEvent.findMany({
            where: { courierUserId: { in: ids }, at: { gte: start, lt: rangeTo } },
            orderBy: [{ at: 'asc' }],
            select: { courierUserId: true, isOnline: true, at: true },
        });
        const points = [];
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
                if (t >= next.getTime())
                    break;
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
    async byCourier(user, courierUserId, from, to) {
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
            if (!a || !d || d <= a)
                return null;
            return Math.round((d - a) / 60000);
        })
            .filter((x) => x != null);
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
};
exports.CourierMetricsService = CourierMetricsService;
exports.CourierMetricsService = CourierMetricsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CourierMetricsService);
//# sourceMappingURL=courier-metrics.service.js.map