import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(opts: { random: boolean }) {
    const where = { status: 'OPEN' as const };

    const pinned = await this.prisma.restaurant.findMany({
      where: { ...where, isPinned: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        slug: true,
        nameRu: true,
        nameKk: true,
        coverImageUrl: true,
        ratingAvg: true,
        ratingCount: true,
        status: true,
        isPinned: true,
        sortOrder: true,
        useRandom: true,
      },
    });

    const others = await this.prisma.restaurant.findMany({
      where: { ...where, isPinned: false },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        slug: true,
        nameRu: true,
        nameKk: true,
        coverImageUrl: true,
        ratingAvg: true,
        ratingCount: true,
        status: true,
        isPinned: true,
        sortOrder: true,
        useRandom: true,
      },
    });

    const finalOthers = opts.random ? this.shuffle(others) : others;

    return {
      pinned,
      items: [...pinned, ...finalOthers],
    };
  }

  async getOne(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        nameRu: true,
        nameKk: true,
        descriptionRu: true,
        descriptionKk: true,
        coverImageUrl: true,
        ratingAvg: true,
        ratingCount: true,
        status: true,
        isPinned: true,
        sortOrder: true,
        useRandom: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!restaurant) throw new NotFoundException('Restaurant not found');
    return restaurant;
  }

  async products(restaurantId: string, opts: { includeUnavailable: boolean }) {
    const exists = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, status: true, nameRu: true, nameKk: true, slug: true },
    });
    if (!exists) throw new NotFoundException('Restaurant not found');

    const products = await this.prisma.product.findMany({
      where: {
        restaurantId,
        ...(opts.includeUnavailable ? {} : { isAvailable: true }),
      },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        titleRu: true,
        titleKk: true,
        descriptionRu: true,
        descriptionKk: true,
        price: true,
        imageUrl: true,
        isAvailable: true,
        category: {
          select: {
            id: true,
            code: true,
            titleRu: true,
            titleKk: true,
            sortOrder: true,
            iconUrl: true,
          },
        },
      },
    });

    return {
      restaurant: exists,
      products,
    };
  }

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
