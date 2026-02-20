import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from '@prisma/client';

type JwtUser = {
  id: string;
  role?: 'CLIENT' | 'ADMIN' | 'COURIER' | 'RESTAURANT';
  restaurantId?: string;
  courierId?: string | null;
};

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

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

    const deliveryFee = 0;
    const total = subtotal + deliveryFee;

    return this.prisma.order.create({
      data: {
        userId,
        restaurantId: dto.restaurantId,
        status: OrderStatus.CREATED,
        subtotal,
        deliveryFee,
        total,
        addressId: dto.addressId,
        phone: dto.phone,
        comment: dto.comment ?? null,
        leaveAtDoor: dto.leaveAtDoor,
        paymentMethod: 'CASH',
        paymentStatus: 'PENDING',
        items: { create: itemsCreate },
      },
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
          createdAt: true,
          status: true,
          total: true,
          paymentStatus: true,

          courierId: true,
          courierFee: true,

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
      createdAt: o.createdAt,
      status: o.status,
      total: o.total,
      paymentStatus: o.paymentStatus,
      restaurant: o.restaurant,

      courierId: o.courierId,
      courierFee: o.courierFee,

      itemsCount: o.items.length,
      previewItems: o.items.slice(0, 2),
    }));

    return { total, items };
  }

  // ============================================================
  // DETAILS (client)
  // ============================================================
  async getOrderById(userId: string | null, orderId: string) {
    const where: any = { id: orderId };
    if (userId) where.userId = userId;

    const order = await this.prisma.order.findFirst({
      where,
      select: {
        id: true,
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
      where.OR = [
        { phone: { contains: q } },
        { user: { phone: { contains: q } } },
        { id: { contains: q } },
        { restaurant: { nameRu: { contains: q, mode: 'insensitive' } } },
      ];
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
          createdAt: true,
          status: true,
          total: true,
          paymentStatus: true,

          courierId: true,
          courierFee: true,
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
      createdAt: o.createdAt,
      status: o.status,
      total: o.total,
      paymentStatus: o.paymentStatus,

      user: o.user,
      restaurant: o.restaurant,

      courierId: o.courierId,
      courierFee: o.courierFee,
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
  async getAdminOrderById(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
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

        courierId: true,
        courierFee: true,
        assignedAt: true,
        pickedUpAt: true,
        deliveredAt: true,

        createdAt: true,
        updatedAt: true,

        user: { select: { id: true, phone: true, firstName: true, lastName: true } },

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
  async updateOrderStatus(user: JwtUser, orderId: string, next: OrderStatus) {
    const role = user.role ?? 'CLIENT';

    if (role === 'CLIENT') {
      throw new ForbiddenException('Clients cannot change order status');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, restaurantId: true, courierId: true },
    });

    if (!order) throw new NotFoundException('Order not found');

    if (role === 'RESTAURANT') {
      if (!user.restaurantId)
        throw new ForbiddenException('restaurantId is missing in JWT user payload');
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

    return this.prisma.order.update({
      where: { id: orderId },
      data,
      select: {
        id: true,
        status: true,
        updatedAt: true,
        pickedUpAt: true,
        deliveredAt: true,
      },
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

  async assignCourier(user: JwtUser, orderId: string, courierUserId: string) {
    if ((user.role ?? 'CLIENT') !== 'ADMIN')
      throw new ForbiddenException('Only admin');

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, courierId: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    this.assertAssignableStatus(order.status as OrderStatus);

    const courier = await this.prisma.courierProfile.findUnique({
      where: { userId: courierUserId },
      select: { userId: true },
    });
    if (!courier) throw new NotFoundException('Courier not found');

    const fee = await this.getEffectiveCourierFee(courier.userId);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          courierId: courier.userId,
          courierFee: fee,
          assignedAt: new Date(),
        },
        select: { id: true, courierId: true, courierFee: true, assignedAt: true },
      });

      await tx.courierProfile.update({
        where: { userId: courier.userId },
        data: { lastAssignedAt: new Date(), lastActiveAt: new Date() },
      });

      return updated;
    });
  }

  async unassignCourier(user: JwtUser, orderId: string) {
    if ((user.role ?? 'CLIENT') !== 'ADMIN')
      throw new ForbiddenException('Only admin');

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
        assignedAt: null,
      },
      select: { id: true, courierId: true, courierFee: true, assignedAt: true },
    });
  }

  async autoAssignCourier(user: JwtUser, orderId: string) {
    if ((user.role ?? 'CLIENT') !== 'ADMIN')
      throw new ForbiddenException('Only admin');

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, courierId: true, status: true },
    });

    if (!order) throw new NotFoundException('Order not found');

    this.assertAssignableStatus(order.status as OrderStatus);

    if (order.courierId) {
      return { ok: true, message: 'Already assigned', courierId: order.courierId };
    }

    const courier = await this.pickBestCourier();
    if (!courier) throw new BadRequestException('No online couriers');

    return this.assignCourier(user, orderId, courier.userId);
  }

  // ============================================================
  // DISPATCHER (no geo)
  // ============================================================
  private async pickBestCourier() {
    const couriers = await this.prisma.courierProfile.findMany({
      where: { isOnline: true },
      select: { userId: true, lastAssignedAt: true },
    });

    if (!couriers.length) return null;

    const active: any[] = await (this.prisma.order as any).groupBy({
      by: ['courierId'],
      where: {
        courierId: { in: couriers.map((c) => c.userId) },
        status: { notIn: ['DELIVERED', 'CANCELED'] },
      },
      _count: { _all: true },
    });

    const activeMap = new Map<string, number>();
    for (const a of active) {
      if (a?.courierId) activeMap.set(a.courierId, Number(a?._count?._all ?? 0));
    }

    const sorted = [...couriers].sort((a, b) => {
      const la = activeMap.get(a.userId) ?? 0;
      const lb = activeMap.get(b.userId) ?? 0;
      if (la !== lb) return la - lb;

      const ta = a.lastAssignedAt ? a.lastAssignedAt.getTime() : 0;
      const tb = b.lastAssignedAt ? b.lastAssignedAt.getTime() : 0;
      return ta - tb;
    });

    return sorted[0] ?? null;
  }

  private async getEffectiveCourierFee(courierUserId: string) {
    const courier = await this.prisma.courierProfile.findUnique({
      where: { userId: courierUserId },
      select: { personalFeeOverride: true },
    });
    if (!courier) throw new NotFoundException('Courier not found');

    if (courier.personalFeeOverride != null) return courier.personalFeeOverride;

    const now = new Date();
    const t = await this.prisma.courierTariff.findFirst({
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      orderBy: { startsAt: 'desc' },
      select: { fee: true },
    });

    return t?.fee ?? 1500;
  }
}
