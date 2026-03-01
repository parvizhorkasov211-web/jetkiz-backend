import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFoodCategoryDto } from './dto/create-food-category.dto';
import { UpdateFoodCategoryDto } from './dto/update-food-category.dto';

function slugifyBase(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9а-яё\s-]/gi, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function withRand(base: string) {
  const rand = Math.random().toString(16).slice(2, 6);
  return `${base}-${rand}`;
}

@Injectable()
export class FoodCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFoodCategoryDto) {
    const restaurantId = dto.restaurantId?.trim();
    if (!restaurantId)
      throw new BadRequestException('restaurantId обязателен');

    if (!dto.titleRu?.trim())
      throw new BadRequestException('titleRu обязателен');

    const titleRu = dto.titleRu.trim();
    const titleKk = dto.titleKk?.trim() || titleRu;

    const base = slugifyBase(titleRu) || 'cat';
    let code = dto.code?.trim() || withRand(base);

    // гарантируем уникальность code внутри ресторана
    for (let attempt = 0; attempt < 7; attempt++) {
      try {
        return await this.prisma.foodCategory.create({
          data: {
            restaurantId,
            code, // ← теперь всегда string
            titleRu,
            titleKk,
            iconUrl: dto.iconUrl ?? null,
            sortOrder: dto.sortOrder ?? 0,
          },
        });
      } catch (e: any) {
        if (e?.code === 'P2002') {
          code = withRand(base);
          continue;
        }
        throw e;
      }
    }

    throw new ConflictException(
      'Не удалось сгенерировать уникальный code категории',
    );
  }

  async listByRestaurant(restaurantId: string) {
    if (!restaurantId)
      throw new BadRequestException('restaurantId обязателен');

    return this.prisma.foodCategory.findMany({
      where: { restaurantId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async update(input: {
    restaurantId: string;
    categoryId: string;
    dto: UpdateFoodCategoryDto;
  }) {
    const { restaurantId, categoryId, dto } = input;

    const category = await this.prisma.foodCategory.findFirst({
      where: { id: categoryId, restaurantId },
    });

    if (!category)
      throw new NotFoundException(
        'Категория не найдена или не принадлежит ресторану',
      );

    return this.prisma.foodCategory.update({
      where: { id: categoryId },
      data: dto,
    });
  }

  async delete(input: {
    restaurantId: string;
    categoryId: string;
    force: boolean;
  }) {
    const { restaurantId, categoryId, force } = input;

    const category = await this.prisma.foodCategory.findFirst({
      where: { id: categoryId, restaurantId },
    });

    if (!category)
      throw new NotFoundException(
        'Категория не найдена или не принадлежит ресторану',
      );

    const productsCount = await this.prisma.product.count({
      where: { categoryId, restaurantId },
    });

    if (productsCount > 0 && !force) {
      throw new ConflictException({
        error: 'CATEGORY_HAS_PRODUCTS',
        productsCount,
      });
    }

    if (productsCount > 0 && force) {
      await this.prisma.product.deleteMany({
        where: { categoryId, restaurantId },
      });
    }

    await this.prisma.foodCategory.delete({
      where: { id: categoryId },
    });

    return { success: true };
  }
}