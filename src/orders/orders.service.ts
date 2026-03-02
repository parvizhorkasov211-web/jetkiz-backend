import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerType, OrderStatus, PricingSource, Prisma } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';

type JwtUser = {
  id: string;
  role?: 'CLIENT' | 'ADMIN' | 'COURIER' | 'RESTAURANT';
  restaurantId?: string;
  courierId?: string | null;
};

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // ✅ унифицируем с RestaurantsService (у тебя там 'main')
  private readonly FIN_CONFIG_ID = 'main';

  // ============================================================
  // ✅ OTD SUPPORT: promisedAt (SLA)
  // ============================================================
  private readonly DEFAULT_PROMISED_MIN = 45;

  private computePromisedAt(base: Date) {
    return new Date(base.getTime() + this.DEFAULT_PROMISED_MIN * 60_000);
  }

  // ============================================================
  // helpers: UUID or NUMBER
  // ============================================================
  private isDigits(v: string) {
    return /^[0-9]+$/.test(String(v ?? '').trim());
  }

  private parseOrderNumber(v: string): number | null {
    if (!this.isDigits(v)) return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.trunc(n);
  }

  private async resolveOrderUuid(orderIdOrNumber: string): Promise<string> {
    const num = this.parseOrderNumber(orderIdOrNumber);
    if (num == null) return orderIdOrNumber;

    const found = await this.prisma.order.findUnique({
      where: { number: num },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Order not found');
    return found.id;
  }

  private ensureAdmin(user: JwtUser) {
    if ((user.role ?? 'CLIENT') !== 'ADMIN') {
      throw new ForbiddenException('Only admin');
    }
  }

  // ============================================================
  // FINANCE CONFIG (singleton row)
  // ============================================================
  // ✅ НЕ async: должен возвращать PrismaPromise, чтобы можно было класть в $transaction([])
  private getOrCreateFinanceConfig(): Prisma.Prisma__FinanceConfigClient<{
    id: string;
    clientDeliveryFeeDefault: number;
    clientDeliveryFeeWeather: number;
    courierPayoutDefault: number;
    courierPayoutWeather: number;
    courierCommissionPctDefault: number;
    restaurantCommissionPctDefault: number;
    weatherEnabled: boolean;
    updatedAt: Date;
  }> {
    return this.prisma.financeConfig.upsert({
      where: { id: this.FIN_CONFIG_ID },
      update: {},
      create: {
        id: this.FIN_CONFIG_ID,
        clientDeliveryFeeDefault: 1200,
        clientDeliveryFeeWeather: 1500,
        courierPayoutDefault: 1100,
        courierPayoutWeather: 1500,
        courierCommissionPctDefault: 15,
        restaurantCommissionPctDefault: 20,
        weatherEnabled: false,
      },
      select: {
        id: true,
        clientDeliveryFeeDefault: true,
        clientDeliveryFeeWeather: true,
        courierPayoutDefault: true,
        courierPayoutWeather: true,
        courierCommissionPctDefault: true,
        restaurantCommissionPctDefault: true,
        weatherEnabled: true,
        updatedAt: true,
      },
    });
  }

  // ============================================================
  // ✅ FINANCE CONFIG API (used by controller)
  // ============================================================
  async getFinanceConfig(user: JwtUser) {
    this.ensureAdmin(user);
    return this.getOrCreateFinanceConfig();
  }

  async updateFinanceConfig(
    user: JwtUser,
    body: {
      clientDeliveryFeeDefault?: number;
      clientDeliveryFeeWeather?: number;
      courierPayoutDefault?: number;
      courierPayoutWeather?: number;
      weatherEnabled?: boolean;
    },
  ) {
    this.ensureAdmin(user);

    const data: any = {};
    const n = (v: any) => Math.max(0, Math.round(Number(v) || 0));

    if (body.clientDeliveryFeeDefault != null)
      data.clientDeliveryFeeDefault = n(body.clientDeliveryFeeDefault);

    if (body.clientDeliveryFeeWeather != null)
      data.clientDeliveryFeeWeather = n(body.clientDeliveryFeeWeather);

    if (body.courierPayoutDefault != null)
      data.courierPayoutDefault = n(body.courierPayoutDefault);

    if (body.courierPayoutWeather != null)
      data.courierPayoutWeather = n(body.courierPayoutWeather);

    if (body.weatherEnabled != null)
      data.weatherEnabled = Boolean(body.weatherEnabled);

    // гарантируем существование строки
    await this.getOrCreateFinanceConfig();

    if (Object.keys(data).length === 0) {
      return this.getOrCreateFinanceConfig();
    }

    return this.prisma.financeConfig.update({
      where: { id: this.FIN_CONFIG_ID },
      data,
      select: {
        id: true,
        clientDeliveryFeeDefault: true,
        clientDeliveryFeeWeather: true,
        courierPayoutDefault: true,
        courierPayoutWeather: true,
        courierCommissionPctDefault: true,
        restaurantCommissionPctDefault: true,
        weatherEnabled: true,
        updatedAt: true,
      },
    });
  }

  async setManualDeliveryFee(
    user: JwtUser,
    orderIdOrNumber: string,
    deliveryFee: number,
  ) {
    this.ensureAdmin(user);

    const orderId = await this.resolveOrderUuid(orderIdOrNumber);

    const fee = Math.max(0, Math.round(Number(deliveryFee) || 0));

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, subtotal: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const total = Math.max(0, Math.round(Number(order.subtotal) || 0)) + fee;

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        deliveryFee: fee,
        total,
        pricingSource: PricingSource.MANUAL,
      },
      select: {
        id: true,
        number: true,
        subtotal: true,
        deliveryFee: true,
        total: true,
        pricingSource: true,
        updatedAt: true,
      },
    });
  }

  private async computeClientDeliveryFeeApplied(): Promise<{
    deliveryFee: number;
    pricingSource: PricingSource;
  }> {
    const cfg = await this.getOrCreateFinanceConfig();
    const weather = Boolean(cfg.weatherEnabled);

    const deliveryFee = weather
      ? cfg.clientDeliveryFeeWeather
      : cfg.clientDeliveryFeeDefault;

    return {
      deliveryFee: Math.max(0, Math.round(Number(deliveryFee) || 0)),
      pricingSource: weather
        ? PricingSource.AUTO_WEATHER
        : PricingSource.AUTO_DEFAULT,
    };
  }

  private async computeCourierPayoutApplied(
    courierUserId: string,
  ): Promise<{
    courierFee: number;
    bonusApplied: number;
    pricingSource: PricingSource;
  }> {
    const [cfg, courier] = await this.prisma.$transaction([
      this.getOrCreateFinanceConfig(),
      this.prisma.courierProfile.findUnique({
        where: { userId: courierUserId },
        select: { personalFeeOverride: true, payoutBonusAdd: true },
      }),
    ]);

    if (!courier) throw new NotFoundException('Courier not found');

    const weather = Boolean(cfg.weatherEnabled);

    let base = weather ? cfg.courierPayoutWeather : cfg.courierPayoutDefault;

    // override действует только когда weather выключен
    if (!weather && courier.personalFeeOverride != null) {
      base = courier.personalFeeOverride;
    }

    const bonus = Math.max(
      0,
      Math.round(Number(courier.payoutBonusAdd ?? 0) || 0),
    );
    const courierFee = Math.max(0, Math.round(Number(base) || 0)) + bonus;

    return {
      courierFee,
      bonusApplied: bonus,
      pricingSource: weather
        ? PricingSource.AUTO_WEATHER
        : PricingSource.AUTO_DEFAULT,
    };
  }

  // ============================================================
  // compatibility
  // ============================================================
  async getAdminOrderByNumber(number: number) {
    return this.getAdminOrderById(String(number));
  }

  async getOrderByNumber(userId: string, number: number) {
    return this.getOrderById(userId, String(number));
  }

  // ============================================================
  // CREATE (client)
  // ============================================================
  async createOrder(userId: string, dto: CreateOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const productIds = dto.items.map((i) => i.productId);

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        restaurantId: dto.restaurantId,
        isAvailable: true,
      },
      select: { id: true, price: true, titleRu: true },
    });

    if (products.length !== dto.items.length) {
      throw new BadRequestException('Some products are missing or unavailable');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    let subtotal = 0;

    const itemsCreate = dto.items.map((item) => {
      const p = productMap.get(item.productId);
      if (!p) throw new BadRequestException('Invalid product in cart');

      subtotal += p.price * item.quantity;

      return {
        productId: p.id,
        title: p.titleRu,
        price: p.price,
        quantity: item.quantity,
      };
    });

    const { deliveryFee, pricingSource } =
      await this.computeClientDeliveryFeeApplied();
    const total = subtotal + deliveryFee;

    // ✅ promisedAt: пишем в БД даже если Prisma types ещё не обновлены
    const createdAt = new Date();
    const promisedAt = this.computePromisedAt(createdAt);

    return this.prisma.order.create({
      data: {
        userId,
        restaurantId: dto.restaurantId,
        status: OrderStatus.CREATED,
        subtotal,
        deliveryFee,
        total,

        pricingSource,
        courierBonusApplied: 0,

        addressId: dto.addressId,
        phone: dto.phone,
        comment: dto.comment ?? null,
        leaveAtDoor: dto.leaveAtDoor,
        paymentMethod: 'CASH',
        paymentStatus: 'PENDING',
        items: { create: itemsCreate },

        createdAt,

        // ⚠️ хак для TS (пока не сделал prisma generate)
        promisedAt,
      } as any,
      include: {
        items: {
          select: {
            id: true,
            productId: true,
            title: true,
            price: true,
            quantity: true,
          },
        },
        restaurant: {
          select: {
            id: true,
            slug: true,
            nameRu: true,
            nameKk: true,
            coverImageUrl: true,
            status: true,
          },
        },
      },
    });
  }

  // ============================================================
  // LIST (client)
  // ============================================================
  async getMyOrders(userId: string, opts: { page: number; limit: number }) {
    const skip = (opts.page - 1) * opts.limit;
    const take = opts.limit;

    const [total, orders] = await this.prisma.$transaction([
      this.prisma.order.count({ where: { userId } }),
      this.prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          number: true,
          createdAt: true,
          status: true,
          total: true,
          paymentStatus: true,
          courierId: true,
          courierFee: true,
          deliveryFee: true,
          restaurant: {
            select: {
              id: true,
              slug: true,
              nameRu: true,
              coverImageUrl: true,
              ratingAvg: true,
              ratingCount: true,
              status: true,
            },
          },
          items: { select: { title: true, quantity: true } },
        },
      }),
    ]);

    const items = orders.map((o) => ({
      id: o.id,
      number: o.number,
      createdAt: o.createdAt,
      status: o.status,
      total: o.total,
      paymentStatus: o.paymentStatus,
      restaurant: o.restaurant,
      courierId: o.courierId,
      courierFee: o.courierFee,
      deliveryFee: o.deliveryFee,
      itemsCount: o.items.length,
      previewItems: o.items.slice(0, 2),
    }));

    return { total, items };
  }

  // ============================================================
  // DETAILS (client)
  // ============================================================
  async getOrderById(userId: string | null, orderIdOrNumber: string) {
    const num = this.parseOrderNumber(orderIdOrNumber);

    const where: any = {};
    if (num != null) where.number = num;
    else where.id = orderIdOrNumber;

    if (userId) where.userId = userId;

    const order = await this.prisma.order.findFirst({
      where,
      select: {
        id: true,
        number: true,
        userId: true,
        restaurantId: true,
        status: true,
        subtotal: true,
        deliveryFee: true,
        total: true,
        addressId: true,
        phone: true,
        comment: true,
        leaveAtDoor: true,
        paymentMethod: true,
        paymentStatus: true,
        ratingGiven: true,
        pricingSource: true,
        courierBonusApplied: true,
        courierId: true,
        courierFee: true,
        assignedAt: true,
        pickedUpAt: true,
        deliveredAt: true,
        createdAt: true,
        updatedAt: true,
        items: {
          select: {
            id: true,
            productId: true,
            title: true,
            price: true,
            quantity: true,
          },
        },
        restaurant: {
          select: {
            id: true,
            slug: true,
            nameRu: true,
            nameKk: true,
            coverImageUrl: true,
            status: true,
          },
        },
        courier: {
          select: {
            userId: true,
            firstName: true,
            lastName: true,
            isOnline: true,
            user: { select: { phone: true } },
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  // ============================================================
  // ADMIN LIST
  // ============================================================
  async getAdminOrders(opts: {
    page: number;
    limit: number;
    q?: string;
    status?: OrderStatus;
  }) {
    const skip = (opts.page - 1) * opts.limit;
    const take = opts.limit;

    const where: any = {};
    if (opts.status) where.status = opts.status;

    if (opts.q && opts.q.trim()) {
      const q = opts.q.trim();
      const num = this.parseOrderNumber(q);

      where.OR = [
        { phone: { contains: q } },
        { user: { phone: { contains: q } } },
        { id: { contains: q } },
        { restaurant: { nameRu: { contains: q, mode: 'insensitive' } } },
      ];

      if (num != null) where.OR.unshift({ number: num });
    }

    const [total, orders] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          number: true,
          createdAt: true,
          status: true,
          total: true,
          paymentStatus: true,
          deliveryFee: true,
          courierFee: true,
          pricingSource: true,
          courierBonusApplied: true,
          courierId: true,
          assignedAt: true,
          pickedUpAt: true,
          deliveredAt: true,
          restaurant: {
            select: {
              id: true,
              slug: true,
              nameRu: true,
              coverImageUrl: true,
              status: true,
            },
          },
          courier: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              user: { select: { phone: true } },
            },
          },
          user: {
            select: { id: true, phone: true, firstName: true, lastName: true },
          },
          items: { select: { title: true, quantity: true } },
        },
      }),
    ]);

    const items = orders.map((o) => ({
      id: o.id,
      number: o.number,
      createdAt: o.createdAt,
      status: o.status,
      total: o.total,
      paymentStatus: o.paymentStatus,
      deliveryFee: o.deliveryFee,
      courierFee: o.courierFee,
      pricingSource: o.pricingSource,
      courierBonusApplied: o.courierBonusApplied,
      user: o.user,
      restaurant: o.restaurant,
      courierId: o.courierId,
      courier: o.courier ?? null,
      itemsCount: o.items.length,
      previewItems: o.items.slice(0, 2),
      assignedAt: o.assignedAt ?? null,
      pickedUpAt: o.pickedUpAt ?? null,
      deliveredAt: o.deliveredAt ?? null,
    }));

    return { total, items };
  }

  // ============================================================
  // ADMIN DETAILS
  // ============================================================
  async getAdminOrderById(orderIdOrNumber: string) {
    const num = this.parseOrderNumber(orderIdOrNumber);

    const order = await this.prisma.order.findUnique({
      where: num != null ? { number: num } : { id: orderIdOrNumber },
      select: {
        id: true,
        number: true,
        userId: true,
        restaurantId: true,
        status: true,
        subtotal: true,
        deliveryFee: true,
        total: true,
        addressId: true,
        phone: true,
        comment: true,
        leaveAtDoor: true,
        paymentMethod: true,
        paymentStatus: true,
        ratingGiven: true,
        pricingSource: true,
        courierBonusApplied: true,
        courierId: true,
        courierFee: true,
        assignedAt: true,
        pickedUpAt: true,
        deliveredAt: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: { id: true, phone: true, firstName: true, lastName: true },
        },
        items: {
          select: {
            id: true,
            productId: true,
            title: true,
            price: true,
            quantity: true,
          },
        },
        restaurant: {
          select: {
            id: true,
            slug: true,
            nameRu: true,
            nameKk: true,
            coverImageUrl: true,
            status: true,
          },
        },
        courier: {
          select: {
            userId: true,
            firstName: true,
            lastName: true,
            isOnline: true,
            user: { select: { phone: true } },
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  // ============================================================
  // STATUS UPDATE
  // ============================================================
  async updateOrderStatus(
    user: JwtUser,
    orderIdOrNumber: string,
    next: OrderStatus,
  ) {
    const orderId = await this.resolveOrderUuid(orderIdOrNumber);
    const role = user.role ?? 'CLIENT';

    if (role === 'CLIENT')
      throw new ForbiddenException('Clients cannot change order status');

    // ⚠️ promisedAt может не быть в типах Prisma → берём order как any
    const order: any = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        restaurantId: true,
        courierId: true,
        createdAt: true,
        promisedAt: true, // (если в типах нет — не падаем, т.к. order:any)
      } as any,
    });

    if (!order) throw new NotFoundException('Order not found');

    if (role === 'RESTAURANT') {
      if (!user.restaurantId) throw new ForbiddenException('restaurantId missing');
      if (order.restaurantId !== user.restaurantId)
        throw new NotFoundException('Order not found');
    }

    if (role === 'COURIER') {
      if (!user.courierId) throw new ForbiddenException('courierId missing');
      if (order.courierId !== user.courierId)
        throw new ForbiddenException('Not your order');
    }

    const allowed: Partial<Record<OrderStatus, OrderStatus[]>> = {
      [OrderStatus.CREATED]: [OrderStatus.ACCEPTED, OrderStatus.CANCELED],
      [OrderStatus.ACCEPTED]: [OrderStatus.COOKING, OrderStatus.CANCELED],
      [OrderStatus.COOKING]: [OrderStatus.READY, OrderStatus.CANCELED],
      [OrderStatus.READY]: [OrderStatus.ON_THE_WAY, OrderStatus.CANCELED],
      [OrderStatus.ON_THE_WAY]: [OrderStatus.DELIVERED, OrderStatus.CANCELED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELED]: [],
      [OrderStatus.PAID]: [],
    };

    const current = order.status as OrderStatus;
    const ok = (allowed[current] ?? []).includes(next);
    if (!ok && role !== 'ADMIN') {
      throw new BadRequestException(
        `Invalid status transition: ${current} -> ${next}`,
      );
    }

    const data: any = { status: next };
    if (next === OrderStatus.ON_THE_WAY) data.pickedUpAt = new Date();
    if (next === OrderStatus.DELIVERED) data.deliveredAt = new Date();

    // ✅ backfill promisedAt для старых заказов
    if (!order.promisedAt && next !== OrderStatus.CANCELED) {
      data.promisedAt = this.computePromisedAt(order.createdAt);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: data as any,
        select: {
          id: true,
          number: true,
          status: true,
          updatedAt: true,
          pickedUpAt: true,
          deliveredAt: true,
        },
      });

      if (next === OrderStatus.DELIVERED) {
        const o = await tx.order.findUnique({
          where: { id: orderId },
          select: { id: true, courierId: true, courierFee: true },
        });

        if (o?.courierId && (o.courierFee ?? 0) > 0) {
          const exists = await tx.courierLedgerEntry.findFirst({
            where: { orderId: o.id, type: LedgerType.ORDER_PAYOUT },
            select: { id: true },
          });

          if (!exists) {
            await tx.courierLedgerEntry.create({
              data: {
                courierUserId: o.courierId,
                orderId: o.id,
                type: LedgerType.ORDER_PAYOUT,
                amount: o.courierFee,
                comment: 'Payout for delivered order',
              },
              select: { id: true },
            });
          }
        }
      }

      return updated;
    });
  }

  // ============================================================
  // ASSIGN/UNASSIGN (admin)
  // ============================================================
  private assertAssignableStatus(status: OrderStatus) {
    if (status === OrderStatus.DELIVERED || status === OrderStatus.CANCELED) {
      throw new BadRequestException('Cannot assign courier to finished order');
    }
  }

  async assignCourier(
    user: JwtUser,
    orderIdOrNumber: string,
    courierUserId: string,
  ) {
    this.ensureAdmin(user);

    const orderId = await this.resolveOrderUuid(orderIdOrNumber);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, courierId: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    this.assertAssignableStatus(order.status as OrderStatus);

    const courierUser = await this.prisma.user.findUnique({
      where: { id: courierUserId },
      select: { id: true, role: true, isActive: true },
    });
    if (!courierUser || courierUser.role !== 'COURIER')
      throw new NotFoundException('Courier not found');
    if (!courierUser.isActive)
      throw new BadRequestException('Courier is blocked (inactive)');

    const courier = await this.prisma.courierProfile.findUnique({
      where: { userId: courierUserId },
      select: { userId: true },
    });
    if (!courier) throw new NotFoundException('Courier not found');

    const payout = await this.computeCourierPayoutApplied(courier.userId);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          courierId: courier.userId,
          courierFee: payout.courierFee,
          courierBonusApplied: payout.bonusApplied,
          pricingSource: payout.pricingSource,
          assignedAt: new Date(),
        },
        select: {
          id: true,
          number: true,
          courierId: true,
          courierFee: true,
          courierBonusApplied: true,
          pricingSource: true,
          assignedAt: true,
        },
      });

      await tx.courierProfile.update({
        where: { userId: courier.userId },
        data: { lastAssignedAt: new Date(), lastActiveAt: new Date() },
      });

      return updated;
    });
  }

  async unassignCourier(user: JwtUser, orderIdOrNumber: string) {
    this.ensureAdmin(user);

    const orderId = await this.resolveOrderUuid(orderIdOrNumber);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, courierId: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    this.assertAssignableStatus(order.status as OrderStatus);

    if (!order.courierId) {
      return { ok: true, message: 'Courier is not assigned' };
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        courierId: null,
        courierFee: 0,
        courierBonusApplied: 0,
        assignedAt: null,
      },
      select: {
        id: true,
        number: true,
        courierId: true,
        courierFee: true,
        courierBonusApplied: true,
        assignedAt: true,
      },
    });
  }

  // ============================================================
  // ✅ AUTO ASSIGN (used by controller)
  // ============================================================
  async autoAssignCourier(user: JwtUser, orderIdOrNumber: string) {
    this.ensureAdmin(user);

    const orderId = await this.resolveOrderUuid(orderIdOrNumber);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, courierId: true, status: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    this.assertAssignableStatus(order.status as OrderStatus);

    if (order.courierId) {
      return {
        ok: true,
        message: 'Already assigned',
        courierId: order.courierId,
      };
    }

    const courier = await this.pickBestCourier();
    if (!courier) throw new BadRequestException('No online couriers');

    // assignCourier требует courierUserId
    return this.assignCourier(user, orderId, courier.userId);
  }

  // ============================================================
  // DISPATCHER (no geo)
  // ============================================================
  private async pickBestCourier(): Promise<{ userId: string } | null> {
    // 1) берём онлайн + активных (User.isActive)
    const couriers = await this.prisma.courierProfile.findMany({
      where: {
        isOnline: true,
        user: { isActive: true },
      },
      select: {
        userId: true,
        lastAssignedAt: true,
        lastActiveAt: true,
        lastSeenAt: true,
      },
    });

    if (!couriers.length) return null;

    const courierIds = couriers.map((c) => c.userId);

    // 2) считаем активные заказы через Order (не храним поле в CourierProfile)
    // Активные = всё, кроме DELIVERED/CANCELED
    const grouped = await this.prisma.order.groupBy({
      by: ['courierId'],
      where: {
        courierId: { in: courierIds },
        status: { notIn: [OrderStatus.DELIVERED, OrderStatus.CANCELED] },
      },
      _count: { _all: true },
    });

    const activeCountMap = new Map<string, number>();
    for (const g of grouped) {
      if (g.courierId) activeCountMap.set(g.courierId, g._count._all);
    }

    // 3) меньше активных заказов — лучше; если равно — кто давно не назначался;
    // потом кто активнее/seen
    const sorted = [...couriers].sort((a, b) => {
      const la = activeCountMap.get(a.userId) ?? 0;
      const lb = activeCountMap.get(b.userId) ?? 0;
      if (la !== lb) return la - lb;

      const ta = a.lastAssignedAt ? a.lastAssignedAt.getTime() : 0;
      const tb = b.lastAssignedAt ? b.lastAssignedAt.getTime() : 0;
      if (ta !== tb) return ta - tb;

      const aa = a.lastActiveAt ? a.lastActiveAt.getTime() : 0;
      const ab = b.lastActiveAt ? b.lastActiveAt.getTime() : 0;
      if (aa !== ab) return ab - aa;

      const sa = a.lastSeenAt ? a.lastSeenAt.getTime() : 0;
      const sb = b.lastSeenAt ? b.lastSeenAt.getTime() : 0;
      return sb - sa;
    });

    return sorted[0] ? { userId: sorted[0].userId } : null;
  }
}