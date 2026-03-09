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
    };

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          restaurantId: true,
          rating: true,
          text: true,
          createdAt: true,
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      items,
      meta: { total, page, limit },
    };
  }

  async getCustomerReviewsAggregate(userId: string) {
    const where = {
      userId,
    };

    const agg = await this.prisma.review.aggregate({
      where,
      _count: { _all: true },
      _avg: { rating: true },
    });

    return {
      reviewsCount: agg?._count?._all ?? 0,
      avgRating: agg?._avg?.rating ?? null,
    };
  }
}