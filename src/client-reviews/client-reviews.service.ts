import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type GetReviewsOpts = {
  includeOrder: boolean;
  page: number;
  limit: number;
};

@Injectable()
export class ClientReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCustomerReviews(userId: string, opts: GetReviewsOpts) {
    const page = Math.max(1, opts.page || 1);
    const limit = Math.min(200, Math.max(1, opts.limit || 50));
    const skip = (page - 1) * limit;

    const where = {
      userId,
      orderId: { not: null as any },
      order: { status: 'DELIVERED' as any },
    };

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where: where as any,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          orderId: true,
          restaurantId: true,
          productId: true,
          rating: true,
          text: true,
          createdAt: true,
          ...(opts.includeOrder
            ? {
                order: {
                  select: {
                    id: true,
                    createdAt: true,
                    total: true,
                    status: true,
                    restaurantId: true,
                    paymentStatus: true,
                    paymentMethod: true,
                  },
                },
              }
            : {}),
        } as any,
      }),
      this.prisma.review.count({ where: where as any }),
    ]);

    return {
      items,
      meta: { total, page, limit },
    };
  }

  async getCustomerReviewsAggregate(userId: string) {
    const where = {
      userId,
      orderId: { not: null as any },
      order: { status: 'DELIVERED' as any },
    };

    const agg = (await this.prisma.review.aggregate({
      where: where as any,
      _count: { _all: true },
      _avg: { rating: true },
    } as any)) as any;

    return {
      reviewsCount: agg?._count?._all ?? 0,
      avgRating: agg?._avg?.rating ?? null,
    };
  }
}
