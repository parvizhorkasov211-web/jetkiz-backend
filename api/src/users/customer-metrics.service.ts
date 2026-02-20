import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, OrderStatus, PaymentStatus, PaymentMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type LastOrderDto = {
  id: string;
  createdAt: Date;
  total: number;
  status: OrderStatus;
  restaurantId: string;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
};

export type CustomerMetricsDto = {
  userId: string;

  totalOrders: number;
  deliveredCount: number;
  canceledCount: number;

  totalSpent: number; // SUM(total) WHERE status=DELIVERED AND paymentStatus=PAID
  avgCheck: number; // floor(totalSpent / deliveredCount)

  firstOrderDate: Date | null;
  lastOrderDate: Date | null;
  daysSinceLastOrder: number | null;

  lastOrder: LastOrderDto | null;
};

@Injectable()
export class CustomerMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(userId: string): Promise<CustomerMetricsDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user || user.role !== 'CLIENT') {
      throw new NotFoundException('CLIENT not found');
    }

    const rows = await this.prisma.$queryRaw<
      Array<{
        totalOrders: bigint;
        deliveredCount: bigint;
        canceledCount: bigint;
        totalSpent: bigint;
        firstOrderDate: Date | null;
        lastOrderDate: Date | null;

        lastOrderId: string | null;
        lastOrderCreatedAt: Date | null;
        lastOrderTotal: number | null;
        lastOrderStatus: OrderStatus | null;
        lastOrderRestaurantId: string | null;
        lastOrderPaymentStatus: PaymentStatus | null;
        lastOrderPaymentMethod: PaymentMethod | null;
      }>
    >(Prisma.sql`
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
    const daysSinceLastOrder =
      lastOrderDate ? Math.floor((Date.now() - new Date(lastOrderDate).getTime()) / 86400000) : null;

    const lastOrder: LastOrderDto | null =
      r?.lastOrderId &&
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
}
