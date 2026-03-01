import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProductDto } from './dto/update-product.dto';

type MenuCategoryDto = {
  id: string;
  titleRu: string;
  titleKk: string;
  iconUrl: string | null;
  sortOrder: number;
};

type MenuItemDto = {
  id: string;
  titleRu: string;
  titleKk: string;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  categoryId: string | null;

  weight: string | null;
  composition: string | null;
  description: string | null;
  isDrink: boolean;

  createdAt: Date;
  updatedAt: Date;
  category?: MenuCategoryDto | null;
};

@Injectable()
export class RestaurantMenuService {
  constructor(private readonly prisma: PrismaService) {}

  async getRestaurantMenu(input: {
    restaurantId: string;
    includeUnavailable: boolean;
  }) {
    const { restaurantId, includeUnavailable } = input;

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        slug: true,
        nameRu: true,
        nameKk: true,
        status: true,
        isInApp: true,
      },
    });

    if (!restaurant) throw new NotFoundException('Ресторан не найден');

    const categories = await this.prisma.foodCategory.findMany({
      where: { restaurantId },
      select: {
        id: true,
        titleRu: true,
        titleKk: true,
        iconUrl: true,
        sortOrder: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { titleRu: 'asc' }],
    });

    const products = await this.prisma.product.findMany({
      where: {
        restaurantId,
        ...(includeUnavailable ? {} : { isAvailable: true }),
      },
      select: {
        id: true,
        titleRu: true,
        titleKk: true,
        price: true,
        imageUrl: true,
        isAvailable: true,
        categoryId: true,
        weight: true,
        composition: true,
        description: true,
        isDrink: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            titleRu: true,
            titleKk: true,
            iconUrl: true,
            sortOrder: true,
          },
        },
      },
      orderBy: [{ isAvailable: 'desc' }, { updatedAt: 'desc' }],
    });

    const itemsByCategory = new Map<string, MenuItemDto[]>();
    const uncategorized: MenuItemDto[] = [];

    for (const p of products as unknown as MenuItemDto[]) {
      if (!p.categoryId) {
        uncategorized.push(p);
        continue;
      }
      const arr = itemsByCategory.get(p.categoryId) || [];
      arr.push(p);
      itemsByCategory.set(p.categoryId, arr);
    }

    const grouped = categories
      .map((c) => ({
        category: c as MenuCategoryDto,
        items: itemsByCategory.get(c.id) || [],
      }))
      .filter((x) => x.items.length > 0);

    const uncategorizedBlock =
      uncategorized.length > 0
        ? {
            category: {
              id: 'uncategorized',
              titleRu: 'Без категории',
              titleKk: 'Санатсыз',
              iconUrl: null,
              sortOrder: 999999,
            } as MenuCategoryDto,
            items: uncategorized,
          }
        : null;

    return {
      restaurant,
      includeUnavailable,
      categoriesTotal: categories.length,
      itemsTotal: products.length,
      grouped: uncategorizedBlock ? [uncategorizedBlock, ...grouped] : grouped,
      categories,
      items: products,
    };
  }

  async createProduct(input: {
    restaurantId: string;
    categoryId: string;
    titleRu: string;
    titleKk: string;
    price: number;
    weight?: string | null;
    composition?: string | null;
    description?: string | null;
    isDrink?: boolean;
  }) {
    const {
      restaurantId,
      categoryId,
      titleRu,
      titleKk,
      price,
      weight,
      composition,
      description,
      isDrink,
    } = input;

    if (!categoryId) throw new BadRequestException('categoryId обязателен');
    if (!titleRu?.trim()) throw new BadRequestException('titleRu обязателен');
    if (!titleKk?.trim()) throw new BadRequestException('titleKk обязателен');
    if (!Number.isFinite(price) || price <= 0)
      throw new BadRequestException('Некорректная цена');

    if (!isDrink && !composition)
      throw new BadRequestException(
        'composition обязателен (если не напиток)',
      );

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant) throw new NotFoundException('Ресторан не найден');

    const category = await this.prisma.foodCategory.findFirst({
      where: { id: categoryId, restaurantId },
    });
    if (!category)
      throw new NotFoundException(
        'Категория не найдена или не принадлежит ресторану',
      );

    return this.prisma.product.create({
      data: {
        restaurantId,
        categoryId,
        titleRu: titleRu.trim(),
        titleKk: titleKk.trim(),
        price: Math.trunc(price),
        weight: weight?.trim() || null,
        composition: composition?.trim() || null,
        description: description?.trim() || null,
        isDrink: Boolean(isDrink),
        isAvailable: true,
      },
    });
  }

  async updateProduct(input: {
    restaurantId: string;
    productId: string;
    dto: UpdateProductDto;
  }) {
    const { restaurantId, productId, dto } = input;

    const product = await this.prisma.product.findFirst({
      where: { id: productId, restaurantId },
    });

    if (!product)
      throw new NotFoundException(
        'Товар не найден или не принадлежит ресторану',
      );

    if (dto.categoryId) {
      const category = await this.prisma.foodCategory.findFirst({
        where: { id: dto.categoryId, restaurantId },
      });

      if (!category)
        throw new NotFoundException(
          'Категория не найдена или не принадлежит ресторану',
        );
    }

    if (
      dto.isDrink === false &&
      dto.composition !== undefined &&
      !dto.composition
    ) {
      throw new BadRequestException(
        'composition обязателен (если не напиток)',
      );
    }

    return this.prisma.product.update({
      where: { id: productId },
      data: {
        ...dto,
        price:
          dto.price !== undefined ? Math.trunc(dto.price) : undefined,
      },
    });
  }

  async deleteProduct(input: {
    restaurantId: string;
    productId: string;
  }) {
    const { restaurantId, productId } = input;

    const product = await this.prisma.product.findFirst({
      where: { id: productId, restaurantId },
    });

    if (!product) throw new NotFoundException('Товар не найден');

    await this.prisma.product.delete({
      where: { id: productId },
    });

    return { success: true };
  }
}