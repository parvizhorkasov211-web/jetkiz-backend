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
};

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(userId: string, dto: CreateOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const productIds = dto.items.map(i => i.productId);

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

    const productMap = new Map(products.map(p => [p.id, p]));
    let subtotal = 0;

    const itemsCreate = dto.items.map(item => {
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

    const items = orders.map(o => ({
      id: o.id,
      createdAt: o.createdAt,
      status: o.status,
      total: o.total,
      paymentStatus: o.paymentStatus,
      restaurant: o.restaurant,
      itemsCount: o.items.length,
      previewItems: o.items.slice(0, 2),
    }));

    return { total, items };
  }

  async getOrderById(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
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
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  // PATCH /orders/:id/status
  async updateOrderStatus(user: JwtUser, orderId: string, next: OrderStatus) {
    const role = user.role ?? 'CLIENT';

    if (role === 'CLIENT') {
      throw new ForbiddenException('Clients cannot change order status');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, restaurantId: true },
    });

    if (!order) throw new NotFoundException('Order not found');

    if (role === 'RESTAURANT') {
      if (!user.restaurantId) {
        throw new ForbiddenException('restaurantId is missing in JWT user payload');
      }
      if (order.restaurantId !== user.restaurantId) {
        throw new NotFoundException('Order not found');
      }
    }

    const allowed: Partial<Record<OrderStatus, OrderStatus[]>> = {
  [OrderStatus.CREATED]: [OrderStatus.ACCEPTED, OrderStatus.CANCELED],

  [OrderStatus.ACCEPTED]: [OrderStatus.COOKING, OrderStatus.CANCELED],
  [OrderStatus.COOKING]: [OrderStatus.READY, OrderStatus.CANCELED],

  [OrderStatus.READY]: [OrderStatus.ON_THE_WAY, OrderStatus.CANCELED],
  [OrderStatus.ON_THE_WAY]: [OrderStatus.DELIVERED, OrderStatus.CANCELED],

  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELED]: [],

  // оплата заглушка — можно оставить отдельно на будущее
  [OrderStatus.PAID]: [],
};

    const current = order.status as OrderStatus;
    const ok = (allowed[current] ?? []).includes(next);

    if (!ok && role !== 'ADMIN') {
      throw new BadRequestException(`Invalid status transition: ${current} -> ${next}`);
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: next },
      select: { id: true, status: true, updatedAt: true },
    });
  }
}
