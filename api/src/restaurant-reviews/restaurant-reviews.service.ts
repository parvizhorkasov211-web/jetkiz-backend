import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

function parseYmdOrThrow(s?: string): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s).trim());
  if (!m) throw new BadRequestException(`Invalid date format (expected YYYY-MM-DD): ${s}`);

  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);

  if (Number.isNaN(dt.getTime())) {
    throw new BadRequestException(`Invalid date: ${s}`);
  }
  return dt;
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
    includeOrder: boolean; // ⚠️ параметр поддерживаем, но игнорируем (в Review нет order)
  }) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: input.restaurantId },
      select: { id: true },
    });

    if (!restaurant) throw new NotFoundException('Ресторан не найден');

    const page = Math.max(1, input.page || 1);
    const limit = Math.min(100, Math.max(1, input.limit || 30));
    const skip = (page - 1) * limit;

    const dFrom = parseYmdOrThrow(input.from);
    const dTo = parseYmdOrThrow(input.to);

    const where: Prisma.ReviewWhereInput = {
      restaurantId: input.restaurantId,
    };

    if (dFrom && dTo) {
      where.createdAt = { gte: startOfDay(dFrom), lte: endOfDay(dTo) };
    } else if (dFrom) {
      where.createdAt = { gte: startOfDay(dFrom) };
    } else if (dTo) {
      where.createdAt = { lte: endOfDay(dTo) };
    }

    // ✅ В Review по схеме есть только user и restaurant
    const include: Prisma.ReviewInclude = {
      user: input.includeUser
        ? { select: { id: true, phone: true, firstName: true, lastName: true } }
        : false,
      // order: ... ❌ НЕЛЬЗЯ: в Review нет relation order
    };

    const [total, items] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include,
      }),
    ]);

    return {
      items,
      meta: { page, limit, total },
    };
  }
}