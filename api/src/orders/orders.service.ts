import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerType, OrderStatus, PricingSource, Prisma } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { PromoCodesService } from '../promo-codes/promo-codes.service';

type JwtUser = {
  id: string;
  role?: 'CLIENT' | 'ADMIN' | 'COURIER' | 'RESTAURANT';
  restaurantId?: string;
  courierId?: string | null;
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promoCodesService: PromoCodesService,
  ) {}

  private readonly FIN_CONFIG_ID = 'main';

  // ============================================================
  // OTD SUPPORT: promisedAt (SLA)
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

  private roundMoney(v: any) {
    return Math.max(0, Math.round(Number(v) || 0));
  }

  private assertCourierFinanceSnapshot(input: {
    courierId?: string | null;
    courierFeeGross?: number | null;
    courierCommissionPctApplied?: number | null;
    courierCommissionAmount?: number | null;
    courierFee?: number | null;
  }) {
    if (!input.courierId) {
      throw new BadRequestException('Courier is not assigned');
    }

    const gross = this.roundMoney(input.courierFeeGross);
    const pct = this.roundMoney(input.courierCommissionPctApplied);
    const commission = this.roundMoney(input.courierCommissionAmount);
    const net = this.roundMoney(input.courierFee);

    if (gross <= 0) {
      throw new BadRequestException('Courier gross fee must be greater than 0');
    }

    if (pct < 0) {
      throw new BadRequestException('Courier commission percent is invalid');
    }

    if (commission < 0) {
      throw new BadRequestException('Courier commission amount is invalid');
    }

    if (commission > gross) {
      throw new BadRequestException('Courier commission cannot exceed gross fee');
    }

    const expectedCommission = this.roundMoney((gross * pct) / 100);
    if (commission !== expectedCommission) {
      throw new BadRequestException(
        `Courier commission mismatch: expected ${expectedCommission}, got ${commission}`,
      );
    }

    const expectedNet = Math.max(0, gross - commission);
    if (net !== expectedNet) {
      throw new BadRequestException(
        `Courier payout mismatch: expected ${expectedNet}, got ${net}`,
      );
    }
  }

  // ============================================================
  // FINANCE CONFIG (singleton row)
  // ============================================================
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
  // FINANCE CONFIG API
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
      courierCommissionPctDefault?: number;
      restaurantCommissionPctDefault?: number;
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

    if (body.courierCommissionPctDefault != null)
      data.courierCommissionPctDefault = n(body.courierCommissionPctDefault);

    if (body.restaurantCommissionPctDefault != null)
      data.restaurantCommissionPctDefault = n(
        body.restaurantCommissionPctDefault,
      );

    if (body.weatherEnabled != null)
      data.weatherEnabled = Boolean(body.weatherEnabled);

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

    const fee = this.roundMoney(deliveryFee);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        subtotal: true,
        discountAmount: true,
        deliveryDiscountAmount: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const total = Math.max(
      0,
      this.roundMoney(order.subtotal) +
        fee -
        this.roundMoney(order.discountAmount) -
        this.roundMoney(order.deliveryDiscountAmount),
    );

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

  /**
   * ЕДИНЫЙ ТАРИФ:
   * стоимость доставки для клиента берём из того же поля,
   * которое является базой для courier gross.
   *
   * Источник правды:
   * - courierPayoutDefault
   * - courierPayoutWeather
   *
   * Старые поля clientDeliveryFeeDefault / clientDeliveryFeeWeather
   * больше не участвуют в расчёте нового заказа.
   */
  private async computeClientDeliveryFeeApplied(): Promise<{
    deliveryFee: number;
    pricingSource: PricingSource;
  }> {
    const cfg = await this.getOrCreateFinanceConfig();
    const weather = Boolean(cfg.weatherEnabled);

    const deliveryFee = weather
      ? cfg.courierPayoutWeather
      : cfg.courierPayoutDefault;

    return {
      deliveryFee: this.roundMoney(deliveryFee),
      pricingSource: weather
        ? PricingSource.AUTO_WEATHER
        : PricingSource.AUTO_DEFAULT,
    };
  }

  /**
   * Immutable courier finance snapshot for Order.
   *
   * Новое правило:
   * - общий тариф доставки = базовая стоимость доставки для клиента
   * - courier gross = этот же тариф
   * - commission = gross * pct
   * - courier net = gross - commission
   *
   * personalFeeOverride больше не участвует в gross,
   * чтобы не ломать единую модель "клиент платит X, от X считаем курьера".
   *
   * payoutBonusAdd остаётся допустимой отдельной надбавкой.
   */
  private async computeCourierFinanceApplied(
    courierUserId: string,
  ): Promise<{
    courierFeeGross: number;
    courierCommissionPctApplied: number;
    courierCommissionAmount: number;
    courierFee: number;
    courierBonusApplied: number;
    pricingSource: PricingSource;
  }> {
    const [cfg, courier] = await this.prisma.$transaction([
      this.getOrCreateFinanceConfig(),
      this.prisma.courierProfile.findUnique({
        where: { userId: courierUserId },
        select: {
          payoutBonusAdd: true,
          courierCommissionPctOverride: true,
        },
      }),
    ]);

    if (!courier) throw new NotFoundException('Courier not found');

    const weather = Boolean(cfg.weatherEnabled);

    const baseDeliveryFee = this.roundMoney(
      weather ? cfg.courierPayoutWeather : cfg.courierPayoutDefault,
    );

    const bonusApplied = this.roundMoney(courier.payoutBonusAdd ?? 0);
    const courierFeeGross = baseDeliveryFee + bonusApplied;

    const courierCommissionPctApplied = this.roundMoney(
      courier.courierCommissionPctOverride ??
        cfg.courierCommissionPctDefault,
    );

    const courierCommissionAmount = this.roundMoney(
      (courierFeeGross * courierCommissionPctApplied) / 100,
    );

    const courierFee = Math.max(0, courierFeeGross - courierCommissionAmount);

    return {
      courierFeeGross,
      courierCommissionPctApplied,
      courierCommissionAmount,
      courierFee,
      courierBonusApplied: bonusApplied,
      pricingSource: weather
        ? PricingSource.AUTO_WEATHER
        : PricingSource.AUTO_DEFAULT,
    };
  }

  private async computeRestaurantFinanceApplied(restaurantId: string): Promise<{
    restaurantCommissionPctApplied: number;
  }> {
    const [cfg, restaurant] = await this.prisma.$transaction([
      this.getOrCreateFinanceConfig(),
      this.prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { restaurantCommissionPctOverride: true },
      }),
    ]);

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const pct =
      restaurant.restaurantCommissionPctOverride ??
      cfg.restaurantCommissionPctDefault;

    return {
      restaurantCommissionPctApplied: this.roundMoney(pct),
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

    let discountAmount = 0;
    let deliveryDiscountAmount = 0;
    let promoCodeId: string | null = null;
    let promoCode: string | null = null;

    if (dto.promoCode?.trim()) {
      const promoResult = await this.promoCodesService.validate({
        code: dto.promoCode,
        userId,
        restaurantId: dto.restaurantId,
        subtotal,
        deliveryFee,
      });

      discountAmount = promoResult.pricing.discountAmount;
      deliveryDiscountAmount = promoResult.pricing.deliveryDiscountAmount;
      promoCodeId = promoResult.promo.id;
      promoCode = promoResult.promo.code;
    }

    const total = Math.max(
      0,
      subtotal + deliveryFee - discountAmount - deliveryDiscountAmount,
    );

    const restaurantFinance =
      await this.computeRestaurantFinanceApplied(dto.restaurantId);

    const restaurantCommissionAmount = Math.max(
      0,
      Math.round(
        (subtotal * restaurantFinance.restaurantCommissionPctApplied) / 100,
      ),
    );

    const restaurantPayoutAmount = Math.max(
      0,
      subtotal - restaurantCommissionAmount,
    );

    const createdAt = new Date();
    const promisedAt = this.computePromisedAt(createdAt);

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId,
          restaurantId: dto.restaurantId,
          status: OrderStatus.CREATED,
          subtotal,
          deliveryFee,
          discountAmount,
          deliveryDiscountAmount,
          total,

          promoCodeId,
          promoCode,

          pricingSource,

          courierId: null,
          courierFeeGross: 0,
          courierCommissionPctApplied: 0,
          courierCommissionAmount: 0,
          courierFee: 0,
          courierBonusApplied: 0,

          restaurantCommissionPctApplied:
            restaurantFinance.restaurantCommissionPctApplied,
          restaurantCommissionAmount,
          restaurantPayoutAmount,

          addressId: dto.addressId,
          phone: dto.phone,
          comment: dto.comment ?? null,
          leaveAtDoor: dto.leaveAtDoor,
          paymentMethod: 'CASH',
          paymentStatus: 'PENDING',
          items: { create: itemsCreate },

          createdAt,
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

      if (promoCodeId) {
        await this.promoCodesService.markUsedTx(tx, {
          promoCodeId,
          userId,
          orderId: order.id,
          discountAmount,
          deliveryDiscountAmount,
        });
      }

      return order;
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
          courierFeeGross: true,
          courierCommissionPctApplied: true,
          courierCommissionAmount: true,
          courierFee: true,
          deliveryFee: true,
          restaurantPayoutAmount: true,
          restaurantCommissionAmount: true,
          restaurantCommissionPctApplied: true,
          restaurantPayoutId: true,
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
      courierFeeGross: o.courierFeeGross,
      courierCommissionPctApplied: o.courierCommissionPctApplied,
      courierCommissionAmount: o.courierCommissionAmount,
      courierFee: o.courierFee,
      deliveryFee: o.deliveryFee,
      restaurantPayoutAmount: o.restaurantPayoutAmount,
      restaurantCommissionAmount: o.restaurantCommissionAmount,
      restaurantCommissionPctApplied: o.restaurantCommissionPctApplied,
      restaurantPayoutId: o.restaurantPayoutId,
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
        discountAmount: true,
        deliveryDiscountAmount: true,
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
        courierFeeGross: true,
        courierCommissionPctApplied: true,
        courierCommissionAmount: true,
        courierFee: true,
        assignedAt: true,
        pickedUpAt: true,
        deliveredAt: true,
        restaurantCommissionPctApplied: true,
        restaurantCommissionAmount: true,
        restaurantPayoutAmount: true,
        restaurantPayoutId: true,
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
          courierFeeGross: true,
          courierCommissionPctApplied: true,
          courierCommissionAmount: true,
          courierFee: true,
          pricingSource: true,
          courierBonusApplied: true,
          courierId: true,
          assignedAt: true,
          pickedUpAt: true,
          deliveredAt: true,
          restaurantCommissionPctApplied: true,
          restaurantCommissionAmount: true,
          restaurantPayoutAmount: true,
          restaurantPayoutId: true,
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
      courierFeeGross: o.courierFeeGross,
      courierCommissionPctApplied: o.courierCommissionPctApplied,
      courierCommissionAmount: o.courierCommissionAmount,
      courierFee: o.courierFee,
      pricingSource: o.pricingSource,
      courierBonusApplied: o.courierBonusApplied,
      restaurantCommissionPctApplied: o.restaurantCommissionPctApplied,
      restaurantCommissionAmount: o.restaurantCommissionAmount,
      restaurantPayoutAmount: o.restaurantPayoutAmount,
      restaurantPayoutId: o.restaurantPayoutId,
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
        discountAmount: true,
        deliveryDiscountAmount: true,
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
        courierFeeGross: true,
        courierCommissionPctApplied: true,
        courierCommissionAmount: true,
        courierFee: true,
        assignedAt: true,
        pickedUpAt: true,
        deliveredAt: true,
        restaurantCommissionPctApplied: true,
        restaurantCommissionAmount: true,
        restaurantPayoutAmount: true,
        restaurantPayoutId: true,
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

    const order: any = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        restaurantId: true,
        courierId: true,
        courierFeeGross: true,
        courierCommissionPctApplied: true,
        courierCommissionAmount: true,
        courierFee: true,
        createdAt: true,
        promisedAt: true,
      } as any,
    });

    if (!order) throw new NotFoundException('Order not found');

    if (role === 'RESTAURANT') {
      if (!user.restaurantId)
        throw new ForbiddenException('restaurantId missing');
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

    if (
      (next === OrderStatus.ON_THE_WAY || next === OrderStatus.DELIVERED) &&
      !order.courierId
    ) {
      throw new BadRequestException(
        'Courier must be assigned before delivery flow',
      );
    }

    if (next === OrderStatus.ON_THE_WAY || next === OrderStatus.DELIVERED) {
      this.assertCourierFinanceSnapshot({
        courierId: order.courierId,
        courierFeeGross: order.courierFeeGross,
        courierCommissionPctApplied: order.courierCommissionPctApplied,
        courierCommissionAmount: order.courierCommissionAmount,
        courierFee: order.courierFee,
      });
    }

    const data: any = { status: next };
    if (next === OrderStatus.ON_THE_WAY) data.pickedUpAt = new Date();
    if (next === OrderStatus.DELIVERED) data.deliveredAt = new Date();

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
          select: {
            id: true,
            courierId: true,
            courierFee: true,
          },
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

    const finance = await this.computeCourierFinanceApplied(courier.userId);

    this.assertCourierFinanceSnapshot({
      courierId: courier.userId,
      courierFeeGross: finance.courierFeeGross,
      courierCommissionPctApplied: finance.courierCommissionPctApplied,
      courierCommissionAmount: finance.courierCommissionAmount,
      courierFee: finance.courierFee,
    });

    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          courierId: courier.userId,
          courierFeeGross: finance.courierFeeGross,
          courierCommissionPctApplied: finance.courierCommissionPctApplied,
          courierCommissionAmount: finance.courierCommissionAmount,
          courierFee: finance.courierFee,
          courierBonusApplied: finance.courierBonusApplied,
          pricingSource: finance.pricingSource,
          assignedAt: now,
        },
        select: {
          id: true,
          number: true,
          courierId: true,
          courierFeeGross: true,
          courierCommissionPctApplied: true,
          courierCommissionAmount: true,
          courierFee: true,
          courierBonusApplied: true,
          pricingSource: true,
          assignedAt: true,
        },
      });

      await tx.courierProfile.update({
        where: { userId: courier.userId },
        data: { lastAssignedAt: now, lastActiveAt: now },
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
        courierFeeGross: 0,
        courierCommissionPctApplied: 0,
        courierCommissionAmount: 0,
        courierFee: 0,
        courierBonusApplied: 0,
        assignedAt: null,
      },
      select: {
        id: true,
        number: true,
        courierId: true,
        courierFeeGross: true,
        courierCommissionPctApplied: true,
        courierCommissionAmount: true,
        courierFee: true,
        courierBonusApplied: true,
        assignedAt: true,
      },
    });
  }

  // ============================================================
  // AUTO ASSIGN
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

    return this.assignCourier(user, orderId, courier.userId);
  }

  // ============================================================
  // DISPATCHER (no geo)
  // ============================================================
  private async pickBestCourier(): Promise<{ userId: string } | null> {
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