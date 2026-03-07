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
exports.RestaurantMetricsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}
function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}
function endOfDay(d) {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
}
function parseYmd(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s))
        return null;
    const d = new Date(`${s}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime()))
        return null;
    return d;
}
function ymdLocal(d) {
    const x = new Date(d);
    const yyyy = x.getFullYear();
    const mm = String(x.getMonth() + 1).padStart(2, '0');
    const dd = String(x.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}
function fullName(u) {
    const s = `${(u.firstName || '').trim()} ${(u.lastName || '').trim()}`.trim();
    return s || null;
}
function rfmStatusRu(totalSpent, totalOrders, recencyDays) {
    if (totalOrders <= 0)
        return 'Новый';
    if (recencyDays == null)
        return 'Неизвестно';
    if (totalSpent >= 100000 && totalOrders >= 10 && recencyDays <= 30)
        return 'Топ-клиент';
    if (totalOrders >= 5 && recencyDays <= 45)
        return 'Постоянный';
    if (totalOrders >= 2 && recencyDays <= 30)
        return 'Перспективный';
    if (totalOrders >= 3 && recencyDays > 60)
        return 'Рискуем потерять';
    if (recencyDays > 45)
        return 'Спящий';
    return 'Активный';
}
let RestaurantMetricsService = class RestaurantMetricsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getRestaurantMetrics(input) {
        const { restaurantId } = input;
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
            select: { id: true, slug: true, nameRu: true, nameKk: true, status: true },
        });
        if (!restaurant)
            throw new common_1.NotFoundException('Ресторан не найден');
        const maxDays = 365;
        let since;
        let until;
        if (input.from || input.to) {
            const dFrom = input.from ? parseYmd(input.from) : null;
            const dTo = input.to ? parseYmd(input.to) : null;
            if (!dFrom || !dTo) {
                const days = clamp(input.days ?? 30, 1, maxDays);
                until = new Date();
                since = new Date(until.getTime() - days * 86400000);
            }
            else {
                since = startOfDay(dFrom);
                until = endOfDay(dTo);
                const diffDays = Math.ceil((until.getTime() - since.getTime()) / 86400000);
                if (diffDays <= 0) {
                    const tmp = since;
                    since = startOfDay(dTo);
                    until = endOfDay(tmp);
                }
                const fixedDiff = Math.ceil((until.getTime() - since.getTime()) / 86400000);
                if (fixedDiff > maxDays) {
                    since = new Date(until.getTime() - maxDays * 86400000);
                }
            }
        }
        else {
            const days = clamp(input.days ?? 30, 1, maxDays);
            until = new Date();
            since = new Date(until.getTime() - days * 86400000);
        }
        const orders = await this.prisma.order.findMany({
            where: {
                restaurantId,
                createdAt: { gte: since, lte: until },
            },
            select: {
                id: true,
                userId: true,
                status: true,
                total: true,
                paymentStatus: true,
                paymentMethod: true,
                createdAt: true,
                user: { select: { phone: true, firstName: true, lastName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        const totalOrders = orders.length;
        const delivered = orders.filter((o) => o.status === 'DELIVERED');
        const canceled = orders.filter((o) => o.status === 'CANCELED');
        const paid = orders.filter((o) => o.paymentStatus === 'PAID');
        const deliveredCount = delivered.length;
        const canceledCount = canceled.length;
        const paidCount = paid.length;
        const totalPaid = paid.reduce((s, o) => s + (o.total || 0), 0);
        const totalDelivered = delivered.reduce((s, o) => s + (o.total || 0), 0);
        const revenueOrders = orders.filter((o) => o.status === 'DELIVERED' && o.paymentStatus === 'PAID');
        const totalRevenue = revenueOrders.reduce((s, o) => s + (o.total || 0), 0);
        const avgCheckRevenue = revenueOrders.length > 0 ? Math.round(totalRevenue / revenueOrders.length) : 0;
        const cancelRatePercent = totalOrders > 0 ? Math.round((canceledCount / totalOrders) * 100) : 0;
        const paidRatePercent = totalOrders > 0 ? Math.round((paidCount / totalOrders) * 100) : 0;
        const deliveredRatePercent = totalOrders > 0 ? Math.round((deliveredCount / totalOrders) * 100) : 0;
        const dailyMap = new Map();
        for (const o of orders) {
            const key = ymdLocal(o.createdAt);
            const cur = dailyMap.get(key) ||
                { date: key, orders: 0, delivered: 0, canceled: 0, revenue: 0, paid: 0 };
            cur.orders += 1;
            if (o.status === 'DELIVERED')
                cur.delivered += 1;
            if (o.status === 'CANCELED')
                cur.canceled += 1;
            if (o.paymentStatus === 'PAID')
                cur.paid += 1;
            if (o.status === 'DELIVERED' && o.paymentStatus === 'PAID')
                cur.revenue += o.total || 0;
            dailyMap.set(key, cur);
        }
        const daily = [];
        {
            const cur = startOfDay(since);
            const last = startOfDay(until);
            while (cur.getTime() <= last.getTime()) {
                const key = ymdLocal(cur);
                const row = dailyMap.get(key) || { date: key, orders: 0, delivered: 0, canceled: 0, paid: 0, revenue: 0 };
                daily.push(row);
                cur.setDate(cur.getDate() + 1);
            }
        }
        const uniqueUsers = new Set(orders.map((o) => o.userId));
        const activeCustomers = uniqueUsers.size;
        const endTs = until.getTime();
        const last7 = new Set();
        const last30 = new Set();
        for (const o of orders) {
            const diffDays = Math.floor((endTs - o.createdAt.getTime()) / 86400000);
            if (diffDays <= 7)
                last7.add(o.userId);
            if (diffDays <= 30)
                last30.add(o.userId);
        }
        const userFirstInPeriod = new Map();
        for (const o of orders) {
            const prev = userFirstInPeriod.get(o.userId);
            if (!prev || o.createdAt.getTime() < prev.getTime())
                userFirstInPeriod.set(o.userId, o.createdAt);
        }
        const userIds = [...userFirstInPeriod.keys()];
        const beforeCounts = userIds.length
            ? await this.prisma.order.groupBy({
                by: ['userId'],
                where: {
                    restaurantId,
                    userId: { in: userIds },
                    createdAt: { lt: since },
                },
                _count: { userId: true },
            })
            : [];
        const hadBefore = new Set(beforeCounts.map((x) => x.userId));
        const newCustomers = userIds.filter((uid) => !hadBefore.has(uid)).length;
        const perUserCount = new Map();
        for (const o of orders)
            perUserCount.set(o.userId, (perUserCount.get(o.userId) || 0) + 1);
        const repeatCustomers = [...perUserCount.values()].filter((n) => n >= 2).length;
        const repeatRatePercent = activeCustomers > 0 ? Math.round((repeatCustomers / activeCustomers) * 100) : 0;
        const reviewsList = await this.prisma.review.findMany({
            where: {
                restaurantId,
                createdAt: { gte: since, lte: until },
            },
            select: { rating: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
        });
        const reviewsCount = reviewsList.length;
        const ratingAvg = reviewsCount > 0
            ? Math.round((reviewsList.reduce((s, r) => s + (r.rating || 0), 0) / reviewsCount) * 10) / 10
            : null;
        const reviewRatePercent = deliveredCount > 0 ? Math.round((reviewsCount / deliveredCount) * 100) : 0;
        const byUser = new Map();
        for (const o of orders) {
            const u = byUser.get(o.userId) || {
                userId: o.userId,
                phone: o.user?.phone || null,
                name: fullName(o.user) || null,
                ordersCount: 0,
                spent: 0,
                lastOrderAt: null,
                recencyDays: null,
                status: 'Новый',
            };
            u.ordersCount += 1;
            if (o.status === 'DELIVERED' && o.paymentStatus === 'PAID')
                u.spent += o.total || 0;
            if (!u.lastOrderAt || o.createdAt.getTime() > u.lastOrderAt.getTime()) {
                u.lastOrderAt = o.createdAt;
            }
            byUser.set(o.userId, u);
        }
        const now = Date.now();
        for (const u of byUser.values()) {
            u.recencyDays = u.lastOrderAt ? Math.floor((now - u.lastOrderAt.getTime()) / 86400000) : null;
            u.status = rfmStatusRu(u.spent, u.ordersCount, u.recencyDays);
        }
        const topClients = [...byUser.values()]
            .sort((a, b) => b.spent - a.spent || b.ordersCount - a.ordersCount)
            .slice(0, 10);
        const rfmDistribution = {};
        for (const u of byUser.values()) {
            rfmDistribution[u.status] = (rfmDistribution[u.status] || 0) + 1;
        }
        let trendRevenuePercent = null;
        {
            const end = endOfDay(until);
            const aFrom = new Date(end.getTime() - 30 * 86400000);
            const bFrom = new Date(end.getTime() - 60 * 86400000);
            allowTrend: if (aFrom.getTime() >= since.getTime()) {
                const orders60 = await this.prisma.order.findMany({
                    where: {
                        restaurantId,
                        createdAt: { gte: bFrom, lte: end },
                    },
                    select: { status: true, paymentStatus: true, total: true, createdAt: true },
                });
                const sumA = orders60
                    .filter((o) => o.createdAt.getTime() >= aFrom.getTime())
                    .filter((o) => o.status === 'DELIVERED' && o.paymentStatus === 'PAID')
                    .reduce((s, o) => s + (o.total || 0), 0);
                const sumB = orders60
                    .filter((o) => o.createdAt.getTime() < aFrom.getTime())
                    .filter((o) => o.status === 'DELIVERED' && o.paymentStatus === 'PAID')
                    .reduce((s, o) => s + (o.total || 0), 0);
                if (sumB > 0)
                    trendRevenuePercent = Math.round(((sumA - sumB) / sumB) * 100);
                else
                    trendRevenuePercent = sumA > 0 ? 100 : 0;
            }
        }
        const suggestions = [];
        if (cancelRatePercent >= 8) {
            suggestions.push({
                type: 'warning',
                title: 'Высокие отмены',
                text: `Отмен: ${cancelRatePercent}%. Проверь наличие товаров и скорость подтверждения заказа.`,
            });
        }
        else if (cancelRatePercent <= 2 && totalOrders >= 10) {
            suggestions.push({
                type: 'success',
                title: 'Отмен почти нет',
                text: `Отмен: ${cancelRatePercent}%. Отличная стабильность.`,
            });
        }
        if (paidRatePercent < 70 && totalOrders >= 10) {
            suggestions.push({
                type: 'warning',
                title: 'Низкая доля оплат',
                text: `Оплат: ${paidRatePercent}%. Проверь оплату/эквайринг и пользовательский путь.`,
            });
        }
        if (reviewRatePercent < 10 && deliveredCount >= 10) {
            suggestions.push({
                type: 'info',
                title: 'Мало отзывов',
                text: `Отзывы: ${reviewRatePercent}% от доставок. Попроси отзыв после доставки (push/баннер).`,
            });
        }
        if (repeatRatePercent < 25 && activeCustomers >= 10) {
            suggestions.push({
                type: 'info',
                title: 'Слабое удержание',
                text: `Повторные клиенты: ${repeatRatePercent}%. Добавь акцию на 2-й заказ или комбо-наборы.`,
            });
        }
        if (trendRevenuePercent != null && trendRevenuePercent <= -15) {
            suggestions.push({
                type: 'warning',
                title: 'Выручка падает',
                text: `Тренд выручки: ${trendRevenuePercent}%. Стоит запустить промо/поднять видимость ресторана.`,
            });
        }
        else if (trendRevenuePercent != null && trendRevenuePercent >= 15) {
            suggestions.push({
                type: 'success',
                title: 'Выручка растёт',
                text: `Тренд выручки: +${trendRevenuePercent}%. Продолжай текущую стратегию.`,
            });
        }
        const recentOrders = orders.slice(0, 20).map((o) => ({
            id: o.id,
            createdAt: o.createdAt.toISOString(),
            status: o.status,
            paymentStatus: o.paymentStatus,
            paymentMethod: o.paymentMethod ?? null,
            total: o.total || 0,
            userId: o.userId,
            userName: o.user ? fullName(o.user) : null,
            userPhone: o.user?.phone ?? null,
        }));
        return {
            restaurant,
            period: {
                from: startOfDay(since).toISOString(),
                to: endOfDay(until).toISOString(),
                days: Math.max(1, Math.ceil((until.getTime() - since.getTime()) / 86400000)),
            },
            totalOrders,
            deliveredCount,
            canceledCount,
            paidCount,
            revenue: {
                totalPaid,
                totalDelivered,
                totalRevenue,
            },
            avgCheckRevenue,
            trendRevenuePercent,
            rates: {
                cancelRatePercent,
                paidRatePercent,
                deliveredRatePercent,
            },
            customers: {
                activeCustomers,
                activeCustomers7d: last7.size,
                activeCustomers30d: last30.size,
                newCustomers,
                repeatRatePercent,
                rfmDistribution,
            },
            reviews: {
                ratingAvg,
                reviewsCount,
                reviewRatePercent,
            },
            daily,
            topClients,
            recentOrders,
            suggestions,
        };
    }
};
exports.RestaurantMetricsService = RestaurantMetricsService;
exports.RestaurantMetricsService = RestaurantMetricsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RestaurantMetricsService);
//# sourceMappingURL=restaurant-metrics.service.js.map