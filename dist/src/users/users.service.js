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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
function buildName(u) {
    const full = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
    return full.length ? full : null;
}
function calcSegment(ordersCount) {
    if (ordersCount <= 0)
        return 'NEW';
    if (ordersCount >= 10)
        return 'VIP';
    return 'REGULAR';
}
function normSegment(segment) {
    if (!segment)
        return undefined;
    const s = String(segment).trim().toUpperCase();
    if (s === 'NEW' || s === 'REGULAR' || s === 'VIP')
        return s;
    return undefined;
}
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getCustomers(page = 1, limit = 20, q, segment) {
        const p = Math.max(1, Number(page || 1));
        const l = Math.min(100, Math.max(1, Number(limit || 20)));
        const skip = (p - 1) * l;
        const seg = normSegment(segment);
        const userWhere = { role: 'CLIENT' };
        if (q) {
            userWhere.OR = [
                { phone: { contains: q, mode: 'insensitive' } },
                { firstName: { contains: q, mode: 'insensitive' } },
                { lastName: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
            ];
        }
        if (seg === 'NEW') {
            const where = { ...userWhere, orders: { none: {} } };
            const [users, total] = await this.prisma.$transaction([
                this.prisma.user.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: l,
                    include: {
                        _count: { select: { orders: true } },
                        orders: {
                            take: 1,
                            orderBy: { createdAt: 'desc' },
                            select: { createdAt: true, status: true, total: true },
                        },
                    },
                }),
                this.prisma.user.count({ where }),
            ]);
            const items = users.map((u) => {
                const ordersCount = u._count.orders;
                const last = u.orders?.[0] ?? null;
                return {
                    id: u.id,
                    phone: u.phone,
                    name: buildName(u),
                    ordersCount,
                    lastOrderAt: last?.createdAt ? last.createdAt.toISOString() : null,
                    lastOrderStatus: last?.status ?? null,
                    lastOrderTotal: last?.total ?? null,
                    segment: calcSegment(ordersCount),
                    createdAt: u.createdAt.toISOString(),
                };
            });
            return { items, meta: { page: p, limit: l, total } };
        }
        if (!seg) {
            const [users, total] = await this.prisma.$transaction([
                this.prisma.user.findMany({
                    where: userWhere,
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: l,
                    include: {
                        _count: { select: { orders: true } },
                        orders: {
                            take: 1,
                            orderBy: { createdAt: 'desc' },
                            select: { createdAt: true, status: true, total: true },
                        },
                    },
                }),
                this.prisma.user.count({ where: userWhere }),
            ]);
            const items = users.map((u) => {
                const ordersCount = u._count.orders;
                const last = u.orders?.[0] ?? null;
                return {
                    id: u.id,
                    phone: u.phone,
                    name: buildName(u),
                    ordersCount,
                    lastOrderAt: last?.createdAt ? last.createdAt.toISOString() : null,
                    lastOrderStatus: last?.status ?? null,
                    lastOrderTotal: last?.total ?? null,
                    segment: calcSegment(ordersCount),
                    createdAt: u.createdAt.toISOString(),
                };
            });
            return { items, meta: { page: p, limit: l, total } };
        }
        const { whereSql } = this.buildUserSearchSql(q);
        const havingSql = seg === 'VIP'
            ? client_1.Prisma.sql `HAVING COUNT(o.id) >= 10`
            : client_1.Prisma.sql `HAVING COUNT(o.id) >= 1 AND COUNT(o.id) < 10`;
        const totalRows = await this.prisma.$queryRaw(client_1.Prisma.sql `
        SELECT COUNT(*)::bigint AS total
        FROM (
          SELECT u.id
          FROM "User" u
          LEFT JOIN "Order" o ON o."userId" = u.id
          WHERE u.role = 'CLIENT'
          ${whereSql}
          GROUP BY u.id
          ${havingSql}
        ) t
      `);
        const total = Number(totalRows?.[0]?.total ?? 0);
        if (total === 0) {
            return { items: [], meta: { page: p, limit: l, total } };
        }
        const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
        WITH seg_users AS (
          SELECT u.id, COUNT(o.id)::bigint AS "ordersCount"
          FROM "User" u
          LEFT JOIN "Order" o ON o."userId" = u.id
          WHERE u.role = 'CLIENT'
          ${whereSql}
          GROUP BY u.id
          ${havingSql}
        )
        SELECT
          u.id,
          u.phone,
          u."firstName",
          u."lastName",
          u."createdAt",
          su."ordersCount",
          lo."createdAt" as "lastOrderAt",
          lo.status as "lastOrderStatus",
          lo.total as "lastOrderTotal"
        FROM seg_users su
        JOIN "User" u ON u.id = su.id
        LEFT JOIN LATERAL (
          SELECT o2."createdAt", o2.status, o2.total
          FROM "Order" o2
          WHERE o2."userId" = u.id
          ORDER BY o2."createdAt" DESC
          LIMIT 1
        ) lo ON true
        ORDER BY su."ordersCount" DESC, u."createdAt" DESC
        LIMIT ${l} OFFSET ${skip}
      `);
        const items = rows.map((r) => {
            const ordersCount = Number(r.ordersCount ?? 0n);
            return {
                id: r.id,
                phone: r.phone,
                name: buildName({ firstName: r.firstName, lastName: r.lastName }),
                ordersCount,
                lastOrderAt: r.lastOrderAt ? r.lastOrderAt.toISOString() : null,
                lastOrderStatus: r.lastOrderStatus ?? null,
                lastOrderTotal: r.lastOrderTotal ?? null,
                segment: calcSegment(ordersCount),
                createdAt: r.createdAt.toISOString(),
            };
        });
        return { items, meta: { page: p, limit: l, total } };
    }
    buildUserSearchSql(q) {
        const qq = (q || '').trim();
        if (!qq)
            return { whereSql: client_1.Prisma.sql `` };
        const pattern = `%${qq}%`;
        return {
            whereSql: client_1.Prisma.sql `
        AND (
          u.phone ILIKE ${pattern}
          OR u."firstName" ILIKE ${pattern}
          OR u."lastName" ILIKE ${pattern}
          OR u.email ILIKE ${pattern}
        )
      `,
        };
    }
    async getCustomerDetails(id) {
        const u = await this.prisma.user.findFirst({
            where: { id, role: 'CLIENT' },
            select: {
                id: true,
                phone: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
                createdAt: true,
                _count: { select: { orders: true } },
                orders: {
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                    select: { createdAt: true, status: true, total: true },
                },
            },
        });
        if (!u)
            throw new common_1.NotFoundException('Customer not found');
        const ordersCount = u._count.orders;
        const last = u.orders?.[0] ?? null;
        return {
            id: u.id,
            phone: u.phone,
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            avatarUrl: u.avatarUrl,
            name: buildName(u),
            ordersCount,
            lastOrderAt: last?.createdAt ? last.createdAt.toISOString() : null,
            lastOrderStatus: last?.status ?? null,
            lastOrderTotal: last?.total ?? null,
            segment: calcSegment(ordersCount),
            createdAt: u.createdAt.toISOString(),
        };
    }
    async getCustomerOrders(id, page = 1, limit = 20) {
        const p = Math.max(1, Number(page || 1));
        const l = Math.min(100, Math.max(1, Number(limit || 20)));
        const skip = (p - 1) * l;
        const exists = await this.prisma.user.findFirst({
            where: { id, role: 'CLIENT' },
            select: { id: true },
        });
        if (!exists)
            throw new common_1.NotFoundException('Customer not found');
        const [items, total] = await this.prisma.$transaction([
            this.prisma.order.findMany({
                where: { userId: id },
                orderBy: { createdAt: 'desc' },
                skip,
                take: l,
                select: {
                    id: true,
                    status: true,
                    total: true,
                    createdAt: true,
                    restaurant: { select: { id: true, nameRu: true } },
                },
            }),
            this.prisma.order.count({ where: { userId: id } }),
        ]);
        return {
            items: items.map((o) => ({
                id: o.id,
                status: o.status,
                total: o.total,
                createdAt: o.createdAt.toISOString(),
                restaurant: o.restaurant,
            })),
            meta: { page: p, limit: l, total },
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map