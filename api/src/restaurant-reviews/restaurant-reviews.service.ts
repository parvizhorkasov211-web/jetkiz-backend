import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function parseYmd(s?: string): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  return new Date(y, mo, d);
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

@Injectable()
export class RestaurantReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRestaurantReviews(input: {
    restaurantId: string;
    from?: string;
    to?: string;
    page: number;
    limit: number;
    includeUser: boolean;
    includeOrder: boolean;
  }) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: input.restaurantId },
      select: { id: true },
    });

    if (!restaurant) throw new NotFoundException('Ресторан не найден');

    const page = Math.max(1, input.page || 1);
    const limit = Math.min(100, Math.max(1, input.limit || 30));
    const skip = (page - 1) * limit;

    const dFrom = parseYmd(input.from);
    const dTo = parseYmd(input.to);

    const where: any = { restaurantId: input.restaurantId };

    if (dFrom && dTo) {
      where.createdAt = { gte: startOfDay(dFrom), lte: endOfDay(dTo) };
    } else if (dFrom) {
      where.createdAt = { gte: startOfDay(dFrom) };
    } else if (dTo) {
      where.createdAt = { lte: endOfDay(dTo) };
    }

    const [total, items] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: input.includeUser
            ? { select: { id: true, phone: true, firstName: true, lastName: true } }
            : false,
          // важно: orderId у тебя есть в Review (ты уже миграцию делал)
          // поэтому можно включать order
          // если в Order есть publicId — Prisma его отдаст, если нет — просто игнор
          order: input.includeOrder
            ? { select: { id: true, createdAt: true, total: true, status: true } as any }
            : false,
        } as any,
      }),
    ]);

    return {
      items,
      meta: { page, limit, total },
    };
  }
}

