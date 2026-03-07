import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CourierPayoutStatus,
  OrderStatus,
  RestaurantPayoutStatus,
} from '@prisma/client';
import * as XLSX from 'xlsx';

type FinancePeriod = 'today' | 'yesterday' | '7d' | '30d' | 'custom';

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly PAYOUT_CUTOFF_HOUR = 23;

  private atHour(date: Date, hour: number) {
    const d = new Date(date);
    d.setHours(hour, 0, 0, 0);
    return d;
  }

  private getCurrentBusinessDayStart(now: Date) {
    const todayCutoff = this.atHour(now, this.PAYOUT_CUTOFF_HOUR);

    if (now.getTime() >= todayCutoff.getTime()) {
      return todayCutoff;
    }

    const prev = new Date(todayCutoff);
    prev.setDate(prev.getDate() - 1);
    return prev;
  }

  private parseDateOnly(value: string, field: 'from' | 'to'): Date {
    const d = new Date(`${value}T00:00:00`);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException(`Invalid ${field} date`);
    }
    return d;
  }

  private requirePaymentReference(value?: string | null) {
    const normalized = value?.trim();

    if (!normalized) {
      throw new BadRequestException('paymentReference is required');
    }

    return normalized;
  }

  private resolvePeriod(
    period: FinancePeriod = 'today',
    from?: string,
    to?: string,
  ) {
    const now = new Date();

    if (period === 'custom') {
      if (!from || !to) {
        throw new BadRequestException('from and to are required for custom period');
      }

      const fromDate = this.parseDateOnly(from, 'from');
      const toDate = this.parseDateOnly(to, 'to');

      if (fromDate.getTime() > toDate.getTime()) {
        throw new BadRequestException('from must be less than or equal to to');
      }

      const start = this.atHour(fromDate, this.PAYOUT_CUTOFF_HOUR);
      start.setDate(start.getDate() - 1);

      const end = this.atHour(toDate, this.PAYOUT_CUTOFF_HOUR);

      const safeEnd = end.getTime() > now.getTime() ? now : end;

      return { start, end: safeEnd, now, cutoffHour: this.PAYOUT_CUTOFF_HOUR };
    }

    const currentBusinessDayStart = this.getCurrentBusinessDayStart(now);

    let start: Date;
    let end: Date;

    switch (period) {
      case 'yesterday': {
        end = new Date(currentBusinessDayStart);
        start = new Date(end);
        start.setDate(start.getDate() - 1);
        break;
      }

      case '7d': {
        start = new Date(currentBusinessDayStart);
        start.setDate(start.getDate() - 6);
        end = new Date(now);
        break;
      }

      case '30d': {
        start = new Date(currentBusinessDayStart);
        start.setDate(start.getDate() - 29);
        end = new Date(now);
        break;
      }

      case 'today':
      default: {
        start = new Date(currentBusinessDayStart);
        end = new Date(now);
        break;
      }
    }

    return { start, end, now, cutoffHour: this.PAYOUT_CUTOFF_HOUR };
  }

  private formatDateForFile(value: Date) {
    const yyyy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const dd = String(value.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private resolveRestaurantScopeAmount(
    row: Awaited<
      ReturnType<FinanceService['getRestaurantPayoutsSummary']>
    >['restaurants'][number],
    scope: 'pending' | 'assigned' | 'paid' | 'all',
  ) {
    switch (scope) {
      case 'pending':
        return row.pendingPayoutAmount;
      case 'assigned':
        return row.unpaidButAssignedAmount;
      case 'paid':
        return row.paidPayoutAmount;
      case 'all':
      default:
        return row.accruedPayoutAmount;
    }
  }

  private resolveCourierScopeAmount(
    row: Awaited<
      ReturnType<FinanceService['getCourierPayoutsSummary']>
    >['couriers'][number],
    scope: 'pending' | 'assigned' | 'paid' | 'all',
  ) {
    switch (scope) {
      case 'pending':
        return row.pendingPayoutAmount;
      case 'assigned':
        return row.unpaidButAssignedAmount;
      case 'paid':
        return row.paidPayoutAmount;
      case 'all':
      default:
        return row.accruedPayoutAmount;
    }
  }

  private applyScopeFilter<
    T extends {
      pendingPayoutAmount: number;
      unpaidButAssignedAmount: number;
      paidPayoutAmount: number;
      accruedPayoutAmount: number;
    },
  >(rows: T[], scope: 'pending' | 'assigned' | 'paid' | 'all') {
    switch (scope) {
      case 'pending':
        return rows.filter((row) => row.pendingPayoutAmount > 0);
      case 'assigned':
        return rows.filter((row) => row.unpaidButAssignedAmount > 0);
      case 'paid':
        return rows.filter((row) => row.paidPayoutAmount > 0);
      case 'all':
      default:
        return rows.filter((row) => row.accruedPayoutAmount > 0);
    }
  }

  async getSummary(
    period: FinancePeriod = 'today',
    from?: string,
    to?: string,
  ) {
    const { start, end, cutoffHour } = this.resolvePeriod(period, from, to);

    const whereDeliveredPeriod = {
      status: OrderStatus.DELIVERED,
      deliveredAt: {
        gte: start,
        lt: end,
      },
    };

    const [ordersDeliveredToday, sumsToday] = await Promise.all([
      this.prisma.order.count({
        where: whereDeliveredPeriod,
      }),

      this.prisma.order.aggregate({
        where: whereDeliveredPeriod,
        _sum: {
          subtotal: true,
          deliveryFee: true,
          discountAmount: true,
          deliveryDiscountAmount: true,
          total: true,
          courierFee: true,
          courierFeeGross: true,
          courierCommissionAmount: true,
          restaurantCommissionAmount: true,
          restaurantPayoutAmount: true,
        },
      }),
    ]);

    const subtotalToday = sumsToday._sum.subtotal ?? 0;
    const deliveryFeesToday = sumsToday._sum.deliveryFee ?? 0;
    const discountsToday = sumsToday._sum.discountAmount ?? 0;
    const deliveryDiscountsToday = sumsToday._sum.deliveryDiscountAmount ?? 0;
    const netCollectedToday = sumsToday._sum.total ?? 0;
    const courierPayoutsToday = sumsToday._sum.courierFee ?? 0;
    const courierFeeGrossToday = sumsToday._sum.courierFeeGross ?? 0;
    const courierCommissionToday = sumsToday._sum.courierCommissionAmount ?? 0;
    const restaurantCommissionToday =
      sumsToday._sum.restaurantCommissionAmount ?? 0;
    const restaurantPayoutsToday = sumsToday._sum.restaurantPayoutAmount ?? 0;

    const gmvToday = subtotalToday + deliveryFeesToday;
    const avgOrderValueToday =
      ordersDeliveredToday > 0
        ? Math.round(netCollectedToday / ordersDeliveredToday)
        : 0;

    return {
      period: {
        key: period,
        start: start.toISOString(),
        end: end.toISOString(),
        cutoffHour,
      },

      ordersToday: ordersDeliveredToday,
      ordersDeliveredToday,

      subtotalToday,
      deliveryFeesToday,

      discountsToday,
      deliveryDiscountsToday,

      gmvToday,
      netCollectedToday,

      courierPayoutsToday,
      courierFeeGrossToday,
      courierCommissionToday,

      restaurantCommissionToday,
      restaurantPayoutsToday,

      avgOrderValueToday,
    };
  }

  async getRestaurantPayoutsSummary(
    period: FinancePeriod = '30d',
    from?: string,
    to?: string,
  ) {
    const { start, end, cutoffHour } = this.resolvePeriod(period, from, to);

    const deliveredOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.DELIVERED,
        deliveredAt: {
          gte: start,
          lt: end,
        },
      },
      select: {
        id: true,
        restaurantId: true,
        restaurantPayoutId: true,
        restaurantCommissionAmount: true,
        restaurantPayoutAmount: true,
        subtotal: true,
        deliveredAt: true,
        restaurant: {
          select: {
            id: true,
            nameRu: true,
            nameKk: true,
            slug: true,
            number: true,
          },
        },
      },
      orderBy: [{ restaurantId: 'asc' }, { deliveredAt: 'desc' }],
    });

    const payoutRows = await this.prisma.restaurantPayout.findMany({
      where: {
        periodFrom: {
          lt: end,
        },
        periodTo: {
          gte: start,
        },
      },
      select: {
        id: true,
        restaurantId: true,
        periodFrom: true,
        periodTo: true,
        ordersCount: true,
        grossSubtotal: true,
        commissionAmount: true,
        payoutAmount: true,
        status: true,
        paidAt: true,
        note: true,
        paymentReference: true,
        paymentComment: true,
        paidByAdminId: true,
        createdAt: true,
        restaurant: {
          select: {
            id: true,
            nameRu: true,
            nameKk: true,
            slug: true,
            number: true,
          },
        },
        paidByAdmin: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
    });

    const byRestaurant = new Map<
      string,
      {
        restaurant: {
          id: string;
          nameRu: string;
          nameKk: string;
          slug: string;
          number: number;
        };
        deliveredOrdersCount: number;
        grossSubtotal: number;
        commissionAmount: number;
        accruedPayoutAmount: number;
        alreadyAssignedToPayoutAmount: number;
        pendingPayoutAmount: number;
        paidPayoutAmount: number;
        lastDeliveredAt: Date | null;
        lastPaidAt: Date | null;
        payouts: Array<{
          id: string;
          periodFrom: string;
          periodTo: string;
          ordersCount: number;
          grossSubtotal: number;
          commissionAmount: number;
          payoutAmount: number;
          status: RestaurantPayoutStatus;
          paidAt: string | null;
          note: string | null;
          paymentReference: string | null;
          paymentComment: string | null;
          paidByAdminId: string | null;
          paidByAdmin: {
            id: string;
            firstName: string | null;
            lastName: string | null;
            email: string | null;
            phone: string;
          } | null;
          createdAt: string;
        }>;
      }
    >();

    for (const order of deliveredOrders) {
      const restaurantId = order.restaurantId;

      if (!byRestaurant.has(restaurantId)) {
        byRestaurant.set(restaurantId, {
          restaurant: {
            id: order.restaurant.id,
            nameRu: order.restaurant.nameRu,
            nameKk: order.restaurant.nameKk,
            slug: order.restaurant.slug,
            number: order.restaurant.number,
          },
          deliveredOrdersCount: 0,
          grossSubtotal: 0,
          commissionAmount: 0,
          accruedPayoutAmount: 0,
          alreadyAssignedToPayoutAmount: 0,
          pendingPayoutAmount: 0,
          paidPayoutAmount: 0,
          lastDeliveredAt: null,
          lastPaidAt: null,
          payouts: [],
        });
      }

      const bucket = byRestaurant.get(restaurantId)!;

      bucket.deliveredOrdersCount += 1;
      bucket.grossSubtotal += order.subtotal ?? 0;
      bucket.commissionAmount += order.restaurantCommissionAmount ?? 0;
      bucket.accruedPayoutAmount += order.restaurantPayoutAmount ?? 0;

      if (order.restaurantPayoutId) {
        bucket.alreadyAssignedToPayoutAmount +=
          order.restaurantPayoutAmount ?? 0;
      } else {
        bucket.pendingPayoutAmount += order.restaurantPayoutAmount ?? 0;
      }

      if (
        order.deliveredAt &&
        (!bucket.lastDeliveredAt ||
          order.deliveredAt.getTime() > bucket.lastDeliveredAt.getTime())
      ) {
        bucket.lastDeliveredAt = order.deliveredAt;
      }
    }

    for (const payout of payoutRows) {
      const restaurantId = payout.restaurantId;

      if (!byRestaurant.has(restaurantId)) {
        byRestaurant.set(restaurantId, {
          restaurant: {
            id: payout.restaurant.id,
            nameRu: payout.restaurant.nameRu,
            nameKk: payout.restaurant.nameKk,
            slug: payout.restaurant.slug,
            number: payout.restaurant.number,
          },
          deliveredOrdersCount: 0,
          grossSubtotal: 0,
          commissionAmount: 0,
          accruedPayoutAmount: 0,
          alreadyAssignedToPayoutAmount: 0,
          pendingPayoutAmount: 0,
          paidPayoutAmount: 0,
          lastDeliveredAt: null,
          lastPaidAt: null,
          payouts: [],
        });
      }

      const bucket = byRestaurant.get(restaurantId)!;

      if (payout.status === RestaurantPayoutStatus.PAID) {
        bucket.paidPayoutAmount += payout.payoutAmount ?? 0;
      }

      if (
        payout.paidAt &&
        (!bucket.lastPaidAt ||
          payout.paidAt.getTime() > bucket.lastPaidAt.getTime())
      ) {
        bucket.lastPaidAt = payout.paidAt;
      }

      bucket.payouts.push({
        id: payout.id,
        periodFrom: payout.periodFrom.toISOString(),
        periodTo: payout.periodTo.toISOString(),
        ordersCount: payout.ordersCount ?? 0,
        grossSubtotal: payout.grossSubtotal ?? 0,
        commissionAmount: payout.commissionAmount ?? 0,
        payoutAmount: payout.payoutAmount ?? 0,
        status: payout.status,
        paidAt: payout.paidAt ? payout.paidAt.toISOString() : null,
        note: payout.note ?? null,
        paymentReference: payout.paymentReference ?? null,
        paymentComment: payout.paymentComment ?? null,
        paidByAdminId: payout.paidByAdminId ?? null,
        paidByAdmin: payout.paidByAdmin
          ? {
              id: payout.paidByAdmin.id,
              firstName: payout.paidByAdmin.firstName ?? null,
              lastName: payout.paidByAdmin.lastName ?? null,
              email: payout.paidByAdmin.email ?? null,
              phone: payout.paidByAdmin.phone,
            }
          : null,
        createdAt: payout.createdAt.toISOString(),
      });
    }

    const restaurants = Array.from(byRestaurant.values())
      .map((item) => ({
        restaurant: item.restaurant,
        deliveredOrdersCount: item.deliveredOrdersCount,
        grossSubtotal: item.grossSubtotal,
        commissionAmount: item.commissionAmount,
        accruedPayoutAmount: item.accruedPayoutAmount,
        alreadyAssignedToPayoutAmount: item.alreadyAssignedToPayoutAmount,
        pendingPayoutAmount: item.pendingPayoutAmount,
        paidPayoutAmount: item.paidPayoutAmount,
        unpaidButAssignedAmount: Math.max(
          0,
          item.alreadyAssignedToPayoutAmount - item.paidPayoutAmount,
        ),
        lastDeliveredAt: item.lastDeliveredAt
          ? item.lastDeliveredAt.toISOString()
          : null,
        lastPaidAt: item.lastPaidAt ? item.lastPaidAt.toISOString() : null,
        payouts: item.payouts,
      }))
      .sort((a, b) => b.pendingPayoutAmount - a.pendingPayoutAmount);

    const totals = restaurants.reduce(
      (acc, row) => {
        acc.restaurantsCount += 1;
        acc.deliveredOrdersCount += row.deliveredOrdersCount;
        acc.grossSubtotal += row.grossSubtotal;
        acc.commissionAmount += row.commissionAmount;
        acc.accruedPayoutAmount += row.accruedPayoutAmount;
        acc.alreadyAssignedToPayoutAmount += row.alreadyAssignedToPayoutAmount;
        acc.pendingPayoutAmount += row.pendingPayoutAmount;
        acc.paidPayoutAmount += row.paidPayoutAmount;
        acc.unpaidButAssignedAmount += row.unpaidButAssignedAmount;
        return acc;
      },
      {
        restaurantsCount: 0,
        deliveredOrdersCount: 0,
        grossSubtotal: 0,
        commissionAmount: 0,
        accruedPayoutAmount: 0,
        alreadyAssignedToPayoutAmount: 0,
        pendingPayoutAmount: 0,
        paidPayoutAmount: 0,
        unpaidButAssignedAmount: 0,
      },
    );

    return {
      period: {
        key: period,
        start: start.toISOString(),
        end: end.toISOString(),
        cutoffHour,
      },
      totals,
      restaurants,
    };
  }

  async getCourierPayoutsSummary(
    period: FinancePeriod = '30d',
    from?: string,
    to?: string,
  ) {
    const { start, end, cutoffHour } = this.resolvePeriod(period, from, to);

    const deliveredOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.DELIVERED,
        courierId: {
          not: null,
        },
        deliveredAt: {
          gte: start,
          lt: end,
        },
      },
      select: {
        id: true,
        courierId: true,
        courierPayoutId: true,
        courierFeeGross: true,
        courierCommissionAmount: true,
        courierFee: true,
        deliveredAt: true,
        courier: {
          select: {
            userId: true,
            firstName: true,
            lastName: true,
            user: {
              select: {
                phone: true,
              },
            },
          },
        },
      },
      orderBy: [{ courierId: 'asc' }, { deliveredAt: 'desc' }],
    });

    const payoutRows = await this.prisma.courierPayout.findMany({
      where: {
        periodFrom: {
          lt: end,
        },
        periodTo: {
          gte: start,
        },
      },
      select: {
        id: true,
        courierUserId: true,
        periodFrom: true,
        periodTo: true,
        ordersCount: true,
        grossAmount: true,
        commissionAmount: true,
        payoutAmount: true,
        status: true,
        paidAt: true,
        note: true,
        paymentReference: true,
        paymentComment: true,
        paidByAdminId: true,
        createdAt: true,
        courier: {
          select: {
            userId: true,
            firstName: true,
            lastName: true,
            user: {
              select: {
                phone: true,
              },
            },
          },
        },
        paidByAdmin: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
    });

    const byCourier = new Map<
      string,
      {
        courier: {
          userId: string;
          firstName: string | null;
          lastName: string | null;
          phone: string | null;
        };
        deliveredOrdersCount: number;
        courierFeeGrossAmount: number;
        commissionAmount: number;
        accruedPayoutAmount: number;
        alreadyAssignedToPayoutAmount: number;
        pendingPayoutAmount: number;
        paidPayoutAmount: number;
        lastDeliveredAt: Date | null;
        lastPaidAt: Date | null;
        payouts: Array<{
          id: string;
          periodFrom: string;
          periodTo: string;
          ordersCount: number;
          grossAmount: number;
          commissionAmount: number;
          payoutAmount: number;
          status: CourierPayoutStatus;
          paidAt: string | null;
          note: string | null;
          paymentReference: string | null;
          paymentComment: string | null;
          paidByAdminId: string | null;
          paidByAdmin: {
            id: string;
            firstName: string | null;
            lastName: string | null;
            email: string | null;
            phone: string;
          } | null;
          createdAt: string;
        }>;
      }
    >();

    for (const order of deliveredOrders) {
      if (!order.courierId || !order.courier) continue;

      const courierId = order.courierId;

      if (!byCourier.has(courierId)) {
        byCourier.set(courierId, {
          courier: {
            userId: order.courier.userId,
            firstName: order.courier.firstName ?? null,
            lastName: order.courier.lastName ?? null,
            phone: order.courier.user?.phone ?? null,
          },
          deliveredOrdersCount: 0,
          courierFeeGrossAmount: 0,
          commissionAmount: 0,
          accruedPayoutAmount: 0,
          alreadyAssignedToPayoutAmount: 0,
          pendingPayoutAmount: 0,
          paidPayoutAmount: 0,
          lastDeliveredAt: null,
          lastPaidAt: null,
          payouts: [],
        });
      }

      const bucket = byCourier.get(courierId)!;

      bucket.deliveredOrdersCount += 1;
      bucket.courierFeeGrossAmount += order.courierFeeGross ?? 0;
      bucket.commissionAmount += order.courierCommissionAmount ?? 0;
      bucket.accruedPayoutAmount += order.courierFee ?? 0;

      if (order.courierPayoutId) {
        bucket.alreadyAssignedToPayoutAmount += order.courierFee ?? 0;
      } else {
        bucket.pendingPayoutAmount += order.courierFee ?? 0;
      }

      if (
        order.deliveredAt &&
        (!bucket.lastDeliveredAt ||
          order.deliveredAt.getTime() > bucket.lastDeliveredAt.getTime())
      ) {
        bucket.lastDeliveredAt = order.deliveredAt;
      }
    }

    for (const payout of payoutRows) {
      const courierId = payout.courierUserId;

      if (!byCourier.has(courierId)) {
        byCourier.set(courierId, {
          courier: {
            userId: payout.courier.userId,
            firstName: payout.courier.firstName ?? null,
            lastName: payout.courier.lastName ?? null,
            phone: payout.courier.user?.phone ?? null,
          },
          deliveredOrdersCount: 0,
          courierFeeGrossAmount: 0,
          commissionAmount: 0,
          accruedPayoutAmount: 0,
          alreadyAssignedToPayoutAmount: 0,
          pendingPayoutAmount: 0,
          paidPayoutAmount: 0,
          lastDeliveredAt: null,
          lastPaidAt: null,
          payouts: [],
        });
      }

      const bucket = byCourier.get(courierId)!;

      if (payout.status === CourierPayoutStatus.PAID) {
        bucket.paidPayoutAmount += payout.payoutAmount ?? 0;
      }

      if (
        payout.paidAt &&
        (!bucket.lastPaidAt ||
          payout.paidAt.getTime() > bucket.lastPaidAt.getTime())
      ) {
        bucket.lastPaidAt = payout.paidAt;
      }

      bucket.payouts.push({
        id: payout.id,
        periodFrom: payout.periodFrom.toISOString(),
        periodTo: payout.periodTo.toISOString(),
        ordersCount: payout.ordersCount ?? 0,
        grossAmount: payout.grossAmount ?? 0,
        commissionAmount: payout.commissionAmount ?? 0,
        payoutAmount: payout.payoutAmount ?? 0,
        status: payout.status,
        paidAt: payout.paidAt ? payout.paidAt.toISOString() : null,
        note: payout.note ?? null,
        paymentReference: payout.paymentReference ?? null,
        paymentComment: payout.paymentComment ?? null,
        paidByAdminId: payout.paidByAdminId ?? null,
        paidByAdmin: payout.paidByAdmin
          ? {
              id: payout.paidByAdmin.id,
              firstName: payout.paidByAdmin.firstName ?? null,
              lastName: payout.paidByAdmin.lastName ?? null,
              email: payout.paidByAdmin.email ?? null,
              phone: payout.paidByAdmin.phone,
            }
          : null,
        createdAt: payout.createdAt.toISOString(),
      });
    }

    const couriers = Array.from(byCourier.values())
      .map((item) => ({
        courier: item.courier,
        deliveredOrdersCount: item.deliveredOrdersCount,
        courierFeeGrossAmount: item.courierFeeGrossAmount,
        commissionAmount: item.commissionAmount,
        accruedPayoutAmount: item.accruedPayoutAmount,
        alreadyAssignedToPayoutAmount: item.alreadyAssignedToPayoutAmount,
        pendingPayoutAmount: item.pendingPayoutAmount,
        paidPayoutAmount: item.paidPayoutAmount,
        unpaidButAssignedAmount: Math.max(
          0,
          item.alreadyAssignedToPayoutAmount - item.paidPayoutAmount,
        ),
        lastDeliveredAt: item.lastDeliveredAt
          ? item.lastDeliveredAt.toISOString()
          : null,
        lastPaidAt: item.lastPaidAt ? item.lastPaidAt.toISOString() : null,
        payouts: item.payouts,
      }))
      .sort((a, b) => b.pendingPayoutAmount - a.pendingPayoutAmount);

    const totals = couriers.reduce(
      (acc, row) => {
        acc.couriersCount += 1;
        acc.deliveredOrdersCount += row.deliveredOrdersCount;
        acc.courierFeeGrossAmount += row.courierFeeGrossAmount;
        acc.commissionAmount += row.commissionAmount;
        acc.accruedPayoutAmount += row.accruedPayoutAmount;
        acc.alreadyAssignedToPayoutAmount += row.alreadyAssignedToPayoutAmount;
        acc.pendingPayoutAmount += row.pendingPayoutAmount;
        acc.paidPayoutAmount += row.paidPayoutAmount;
        acc.unpaidButAssignedAmount += row.unpaidButAssignedAmount;
        return acc;
      },
      {
        couriersCount: 0,
        deliveredOrdersCount: 0,
        courierFeeGrossAmount: 0,
        commissionAmount: 0,
        accruedPayoutAmount: 0,
        alreadyAssignedToPayoutAmount: 0,
        pendingPayoutAmount: 0,
        paidPayoutAmount: 0,
        unpaidButAssignedAmount: 0,
      },
    );

    return {
      period: {
        key: period,
        start: start.toISOString(),
        end: end.toISOString(),
        cutoffHour,
      },
      totals,
      couriers,
    };
  }

  async createRestaurantPayout(params: {
    restaurantId: string;
    periodFrom: Date;
    periodTo: Date;
    note?: string | null;
  }) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: params.restaurantId },
      select: {
        id: true,
        nameRu: true,
        nameKk: true,
        slug: true,
        number: true,
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const orders = await this.prisma.order.findMany({
      where: {
        restaurantId: params.restaurantId,
        status: OrderStatus.DELIVERED,
        restaurantPayoutId: null,
        deliveredAt: {
          gte: params.periodFrom,
          lte: params.periodTo,
        },
      },
      select: {
        id: true,
        number: true,
        subtotal: true,
        restaurantCommissionAmount: true,
        restaurantPayoutAmount: true,
        deliveredAt: true,
      },
      orderBy: { deliveredAt: 'asc' },
    });

    if (!orders.length) {
      throw new NotFoundException('No delivered unpaid orders for this period');
    }

    const grossSubtotal = orders.reduce(
      (sum, order) => sum + (order.subtotal ?? 0),
      0,
    );
    const commissionAmount = orders.reduce(
      (sum, order) => sum + (order.restaurantCommissionAmount ?? 0),
      0,
    );
    const payoutAmount = orders.reduce(
      (sum, order) => sum + (order.restaurantPayoutAmount ?? 0),
      0,
    );

    return this.prisma.$transaction(async (tx) => {
      const payout = await tx.restaurantPayout.create({
        data: {
          restaurantId: params.restaurantId,
          periodFrom: params.periodFrom,
          periodTo: params.periodTo,
          ordersCount: orders.length,
          grossSubtotal,
          commissionAmount,
          payoutAmount,
          status: RestaurantPayoutStatus.PENDING,
          note: params.note ?? null,
        },
        select: {
          id: true,
          restaurantId: true,
          periodFrom: true,
          periodTo: true,
          ordersCount: true,
          grossSubtotal: true,
          commissionAmount: true,
          payoutAmount: true,
          status: true,
          paidAt: true,
          note: true,
          paymentReference: true,
          paymentComment: true,
          paidByAdminId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await tx.order.updateMany({
        where: {
          id: { in: orders.map((o) => o.id) },
        },
        data: {
          restaurantPayoutId: payout.id,
        },
      });

      return {
        payout: {
          ...payout,
          periodFrom: payout.periodFrom.toISOString(),
          periodTo: payout.periodTo.toISOString(),
          paidAt: payout.paidAt ? payout.paidAt.toISOString() : null,
          createdAt: payout.createdAt.toISOString(),
          updatedAt: payout.updatedAt.toISOString(),
        },
        restaurant,
        orders: orders.map((order) => ({
          ...order,
          deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
        })),
      };
    });
  }

  async markRestaurantPayoutPaid(
    payoutId: string,
    params?: {
      paymentReference?: string | null;
      paymentComment?: string | null;
      paidByAdminId?: string | null;
    },
  ) {
    const paymentReference = this.requirePaymentReference(
      params?.paymentReference ?? null,
    );

    const payout = await this.prisma.restaurantPayout.findUnique({
      where: { id: payoutId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!payout) {
      throw new NotFoundException('Restaurant payout not found');
    }

    if (payout.status === RestaurantPayoutStatus.PAID) {
      throw new BadRequestException('Restaurant payout already paid');
    }

    const updated = await this.prisma.restaurantPayout.update({
      where: { id: payoutId },
      data: {
        status: RestaurantPayoutStatus.PAID,
        paidAt: new Date(),
        paymentReference,
        paymentComment: params?.paymentComment?.trim() || null,
        paidByAdminId: params?.paidByAdminId ?? null,
      },
      select: {
        id: true,
        restaurantId: true,
        periodFrom: true,
        periodTo: true,
        ordersCount: true,
        grossSubtotal: true,
        commissionAmount: true,
        payoutAmount: true,
        status: true,
        paidAt: true,
        note: true,
        paymentReference: true,
        paymentComment: true,
        paidByAdminId: true,
        createdAt: true,
        updatedAt: true,
        restaurant: {
          select: {
            id: true,
            nameRu: true,
            nameKk: true,
            slug: true,
            number: true,
          },
        },
        paidByAdmin: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return {
      ...updated,
      periodFrom: updated.periodFrom.toISOString(),
      periodTo: updated.periodTo.toISOString(),
      paidAt: updated.paidAt ? updated.paidAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async getRestaurantPayoutsList(restaurantId?: string) {
    const payouts = await this.prisma.restaurantPayout.findMany({
      where: restaurantId ? { restaurantId } : undefined,
      select: {
        id: true,
        restaurantId: true,
        periodFrom: true,
        periodTo: true,
        ordersCount: true,
        grossSubtotal: true,
        commissionAmount: true,
        payoutAmount: true,
        status: true,
        paidAt: true,
        note: true,
        paymentReference: true,
        paymentComment: true,
        paidByAdminId: true,
        createdAt: true,
        updatedAt: true,
        restaurant: {
          select: {
            id: true,
            nameRu: true,
            nameKk: true,
            slug: true,
            number: true,
          },
        },
        paidByAdmin: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return payouts.map((payout) => ({
      ...payout,
      periodFrom: payout.periodFrom.toISOString(),
      periodTo: payout.periodTo.toISOString(),
      paidAt: payout.paidAt ? payout.paidAt.toISOString() : null,
      createdAt: payout.createdAt.toISOString(),
      updatedAt: payout.updatedAt.toISOString(),
    }));
  }

  async createCourierPayout(params: {
    courierUserId: string;
    periodFrom: Date;
    periodTo: Date;
    note?: string | null;
  }) {
    const courier = await this.prisma.courierProfile.findUnique({
      where: { userId: params.courierUserId },
      select: {
        userId: true,
        firstName: true,
        lastName: true,
        user: {
          select: {
            phone: true,
          },
        },
      },
    });

    if (!courier) {
      throw new NotFoundException('Courier not found');
    }

    const orders = await this.prisma.order.findMany({
      where: {
        courierId: params.courierUserId,
        status: OrderStatus.DELIVERED,
        courierPayoutId: null,
        deliveredAt: {
          gte: params.periodFrom,
          lte: params.periodTo,
        },
      },
      select: {
        id: true,
        number: true,
        courierFeeGross: true,
        courierCommissionAmount: true,
        courierFee: true,
        deliveredAt: true,
      },
      orderBy: { deliveredAt: 'asc' },
    });

    if (!orders.length) {
      throw new NotFoundException(
        'No delivered unpaid courier orders for this period',
      );
    }

    const grossAmount = orders.reduce(
      (sum, order) => sum + (order.courierFeeGross ?? 0),
      0,
    );
    const commissionAmount = orders.reduce(
      (sum, order) => sum + (order.courierCommissionAmount ?? 0),
      0,
    );
    const payoutAmount = orders.reduce(
      (sum, order) => sum + (order.courierFee ?? 0),
      0,
    );

    return this.prisma.$transaction(async (tx) => {
      const payout = await tx.courierPayout.create({
        data: {
          courierUserId: params.courierUserId,
          periodFrom: params.periodFrom,
          periodTo: params.periodTo,
          ordersCount: orders.length,
          grossAmount,
          commissionAmount,
          payoutAmount,
          status: CourierPayoutStatus.PENDING,
          note: params.note ?? null,
        },
        select: {
          id: true,
          courierUserId: true,
          periodFrom: true,
          periodTo: true,
          ordersCount: true,
          grossAmount: true,
          commissionAmount: true,
          payoutAmount: true,
          status: true,
          paidAt: true,
          note: true,
          paymentReference: true,
          paymentComment: true,
          paidByAdminId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await tx.order.updateMany({
        where: {
          id: { in: orders.map((o) => o.id) },
        },
        data: {
          courierPayoutId: payout.id,
        },
      });

      return {
        payout: {
          ...payout,
          periodFrom: payout.periodFrom.toISOString(),
          periodTo: payout.periodTo.toISOString(),
          paidAt: payout.paidAt ? payout.paidAt.toISOString() : null,
          createdAt: payout.createdAt.toISOString(),
          updatedAt: payout.updatedAt.toISOString(),
        },
        courier: {
          userId: courier.userId,
          firstName: courier.firstName,
          lastName: courier.lastName,
          phone: courier.user?.phone ?? null,
        },
        orders: orders.map((order) => ({
          ...order,
          deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
        })),
      };
    });
  }

  async markCourierPayoutPaid(
    payoutId: string,
    params?: {
      paymentReference?: string | null;
      paymentComment?: string | null;
      paidByAdminId?: string | null;
    },
  ) {
    const paymentReference = this.requirePaymentReference(
      params?.paymentReference ?? null,
    );

    const payout = await this.prisma.courierPayout.findUnique({
      where: { id: payoutId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!payout) {
      throw new NotFoundException('Courier payout not found');
    }

    if (payout.status === CourierPayoutStatus.PAID) {
      throw new BadRequestException('Courier payout already paid');
    }

    const updated = await this.prisma.courierPayout.update({
      where: { id: payoutId },
      data: {
        status: CourierPayoutStatus.PAID,
        paidAt: new Date(),
        paymentReference,
        paymentComment: params?.paymentComment?.trim() || null,
        paidByAdminId: params?.paidByAdminId ?? null,
      },
      select: {
        id: true,
        courierUserId: true,
        periodFrom: true,
        periodTo: true,
        ordersCount: true,
        grossAmount: true,
        commissionAmount: true,
        payoutAmount: true,
        status: true,
        paidAt: true,
        note: true,
        paymentReference: true,
        paymentComment: true,
        paidByAdminId: true,
        createdAt: true,
        updatedAt: true,
        courier: {
          select: {
            userId: true,
            firstName: true,
            lastName: true,
            user: {
              select: {
                phone: true,
              },
            },
          },
        },
        paidByAdmin: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return {
      ...updated,
      periodFrom: updated.periodFrom.toISOString(),
      periodTo: updated.periodTo.toISOString(),
      paidAt: updated.paidAt ? updated.paidAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async getCourierPayoutsList(courierUserId?: string) {
    const payouts = await this.prisma.courierPayout.findMany({
      where: courierUserId ? { courierUserId } : undefined,
      select: {
        id: true,
        courierUserId: true,
        periodFrom: true,
        periodTo: true,
        ordersCount: true,
        grossAmount: true,
        commissionAmount: true,
        payoutAmount: true,
        status: true,
        paidAt: true,
        note: true,
        paymentReference: true,
        paymentComment: true,
        paidByAdminId: true,
        createdAt: true,
        updatedAt: true,
        courier: {
          select: {
            userId: true,
            firstName: true,
            lastName: true,
            user: {
              select: {
                phone: true,
              },
            },
          },
        },
        paidByAdmin: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return payouts.map((payout) => ({
      ...payout,
      periodFrom: payout.periodFrom.toISOString(),
      periodTo: payout.periodTo.toISOString(),
      paidAt: payout.paidAt ? payout.paidAt.toISOString() : null,
      createdAt: payout.createdAt.toISOString(),
      updatedAt: payout.updatedAt.toISOString(),
    }));
  }

  async exportRestaurantPayoutsToExcel(params: {
    period: FinancePeriod;
    from?: string;
    to?: string;
    scope: 'pending' | 'assigned' | 'paid' | 'all';
  }) {
    const summary = await this.getRestaurantPayoutsSummary(
      params.period,
      params.from,
      params.to,
    );

    const rows = this.applyScopeFilter(summary.restaurants, params.scope).map(
      (row) => ({
        'Ресторан': row.restaurant.nameRu || row.restaurant.nameKk || '',
        'Номер ресторана': row.restaurant.number,
        Slug: row.restaurant.slug,
        'Заказов': row.deliveredOrdersCount,
        'Сумма блюд': row.grossSubtotal,
        'Комиссия сервиса': row.commissionAmount,
        'Всего начислено': row.accruedPayoutAmount,
        'К выплате': row.pendingPayoutAmount,
        'В payout': row.unpaidButAssignedAmount,
        'Уже выплачено': row.paidPayoutAmount,
        'Сумма по текущему scope': this.resolveRestaurantScopeAmount(
          row,
          params.scope,
        ),
        'Последняя доставка': row.lastDeliveredAt ?? '',
        'Последняя выплата': row.lastPaidAt ?? '',
      }),
    );

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Restaurant payouts');

    const buffer = XLSX.write(wb, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    const filename = `restaurant-payouts-${params.scope}-${this.formatDateForFile(
      new Date(),
    )}.xlsx`;

    return { buffer, filename };
  }

  async exportCourierPayoutsToExcel(params: {
    period: FinancePeriod;
    from?: string;
    to?: string;
    scope: 'pending' | 'assigned' | 'paid' | 'all';
  }) {
    const summary = await this.getCourierPayoutsSummary(
      params.period,
      params.from,
      params.to,
    );

    const rows = this.applyScopeFilter(summary.couriers, params.scope).map(
      (row) => ({
        'Курьер': `${row.courier.lastName ?? ''} ${row.courier.firstName ?? ''}`.trim(),
        'Телефон': row.courier.phone ?? '',
        'Заказов': row.deliveredOrdersCount,
        'Courier gross': row.courierFeeGrossAmount,
        'Комиссия сервиса': row.commissionAmount,
        'Всего начислено': row.accruedPayoutAmount,
        'К выплате': row.pendingPayoutAmount,
        'В payout': row.unpaidButAssignedAmount,
        'Уже выплачено': row.paidPayoutAmount,
        'Сумма по текущему scope': this.resolveCourierScopeAmount(
          row,
          params.scope,
        ),
        'Последняя доставка': row.lastDeliveredAt ?? '',
        'Последняя выплата': row.lastPaidAt ?? '',
      }),
    );

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Courier payouts');

    const buffer = XLSX.write(wb, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    const filename = `courier-payouts-${params.scope}-${this.formatDateForFile(
      new Date(),
    )}.xlsx`;

    return { buffer, filename };
  }
}