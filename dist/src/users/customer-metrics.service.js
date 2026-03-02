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
exports.CustomerMetricsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let CustomerMetricsService = class CustomerMetricsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getMetrics(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true },
        });
        if (!user || user.role !== 'CLIENT') {
            throw new common_1.NotFoundException('CLIENT not found');
        }
        const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT
        agg."totalOrders",
        agg."deliveredCount",
        agg."canceledCount",
        agg."totalSpent",
        agg."firstOrderDate",
        agg."lastOrderDate",

        lo.id              AS "lastOrderId",
        lo."createdAt"     AS "lastOrderCreatedAt",
        lo.total           AS "lastOrderTotal",
        lo.status          AS "lastOrderStatus",
        lo."restaurantId"  AS "lastOrderRestaurantId",
        lo."paymentStatus" AS "lastOrderPaymentStatus",
        lo."paymentMethod" AS "lastOrderPaymentMethod"
      FROM (
        SELECT
          COUNT(*)::bigint AS "totalOrders",
          COUNT(*) FILTER (WHERE o.status = 'DELIVERED')::bigint AS "deliveredCount",
          COUNT(*) FILTER (WHERE o.status = 'CANCELED')::bigint AS "canceledCount",
          COALESCE(
            SUM(o.total) FILTER (WHERE o.status = 'DELIVERED' AND o."paymentStatus" = 'PAID'),
            0
          )::bigint AS "totalSpent",
          MIN(o."createdAt") AS "firstOrderDate",
          MAX(o."createdAt") AS "lastOrderDate"
        FROM "Order" o
        WHERE o."userId" = ${userId}
      ) agg
      LEFT JOIN LATERAL (
        SELECT
          o2.id,
          o2."createdAt",
          o2.total,
          o2.status,
          o2."restaurantId",
          o2."paymentStatus",
          o2."paymentMethod"
        FROM "Order" o2
        WHERE o2."userId" = ${userId}
        ORDER BY o2."createdAt" DESC
        LIMIT 1
      ) lo ON TRUE;
    `);
        const r = rows[0];
        const totalOrders = Number(r?.totalOrders ?? 0n);
        const deliveredCount = Number(r?.deliveredCount ?? 0n);
        const canceledCount = Number(r?.canceledCount ?? 0n);
        const totalSpent = Number(r?.totalSpent ?? 0n);
        const avgCheck = deliveredCount > 0 ? Math.floor(totalSpent / deliveredCount) : 0;
        const lastOrderDate = r?.lastOrderDate ?? null;
        const daysSinceLastOrder = lastOrderDate ? Math.floor((Date.now() - new Date(lastOrderDate).getTime()) / 86400000) : null;
        const lastOrder = r?.lastOrderId &&
            r?.lastOrderCreatedAt &&
            r?.lastOrderTotal !== null &&
            r?.lastOrderStatus &&
            r?.lastOrderRestaurantId &&
            r?.lastOrderPaymentStatus &&
            r?.lastOrderPaymentMethod
            ? {
                id: r.lastOrderId,
                createdAt: r.lastOrderCreatedAt,
                total: r.lastOrderTotal,
                status: r.lastOrderStatus,
                restaurantId: r.lastOrderRestaurantId,
                paymentStatus: r.lastOrderPaymentStatus,
                paymentMethod: r.lastOrderPaymentMethod,
            }
            : null;
        return {
            userId,
            totalOrders,
            deliveredCount,
            canceledCount,
            totalSpent,
            avgCheck,
            firstOrderDate: r?.firstOrderDate ?? null,
            lastOrderDate,
            daysSinceLastOrder,
            lastOrder,
        };
    }
};
exports.CustomerMetricsService = CustomerMetricsService;
exports.CustomerMetricsService = CustomerMetricsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CustomerMetricsService);
//# sourceMappingURL=customer-metrics.service.js.map