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

type MenuItemImageDto = {
  id: string;
  url: string;
  isMain: boolean;
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

  images?: MenuItemImageDto[];

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
        images: {
          select: {
            id: true,
            url: true,
            isMain: true,
            sortOrder: true,
          },
          orderBy: [
            { isMain: 'desc' },
            { sortOrder: 'asc' },
            { createdAt: 'asc' },
          ],
        },
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

    // картинки как URL (обратная совместимость)
    mainImageUrl?: string | null;
    additionalImageUrls?: string[] | null;
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
      mainImageUrl,
      additionalImageUrls,
    } = input;

    if (!categoryId) throw new BadRequestException('categoryId обязателен');
    if (!titleRu?.trim()) throw new BadRequestException('titleRu обязателен');
    if (!titleKk?.trim()) throw new BadRequestException('titleKk обязателен');
    if (!Number.isFinite(price) || price <= 0)
      throw new BadRequestException('Некорректная цена');

    if (!isDrink && !composition)
      throw new BadRequestException('composition обязателен (если не напиток)');

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

    const main = (mainImageUrl || '').trim() || null;

    const extrasRaw = Array.isArray(additionalImageUrls)
      ? additionalImageUrls
      : [];
    const extras = extrasRaw.map((x) => String(x || '').trim()).filter(Boolean);

    if (extras.length > 10) {
      throw new BadRequestException('Можно максимум 10 дополнительных фото');
    }

    const imagesToCreate = main
      ? [
          { url: main, isMain: true, sortOrder: 0 },
          ...extras.map((url, idx) => ({
            url,
            isMain: false,
            sortOrder: idx + 1,
          })),
        ]
      : extras.map((url, idx) => ({
          url,
          isMain: false,
          sortOrder: idx + 1,
        }));

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

        // совместимость: кладём главное в imageUrl
        imageUrl: main,

        ...(imagesToCreate.length
          ? {
              images: {
                create: imagesToCreate,
              },
            }
          : {}),
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
      throw new BadRequestException('composition обязателен (если не напиток)');
    }

    return this.prisma.product.update({
      where: { id: productId },
      data: {
        ...dto,
        price: dto.price !== undefined ? Math.trunc(dto.price) : undefined,
      },
    });
  }

  // ==========================
  // IMAGES API (под твой фронт)
  // ==========================

  // REPLACE: 1 main + up to 10 others
  async setProductImages(input: {
    restaurantId: string;
    productId: string;
    mainFile: Express.Multer.File | null;
    otherFiles: Express.Multer.File[];
  }) {
    const { restaurantId, productId, mainFile, otherFiles } = input;

    const product = await this.prisma.product.findFirst({
      where: { id: productId, restaurantId },
      select: { id: true },
    });

    if (!product)
      throw new NotFoundException(
        'Товар не найден или не принадлежит ресторану',
      );

    if (!mainFile) {
      throw new BadRequestException('main фото обязательно (1 файл)');
    }

    if (otherFiles.length > 10) {
      throw new BadRequestException('Можно максимум 10 дополнительных фото');
    }

    const mainUrl = `/uploads/products/${mainFile.filename}`;
    const otherUrls = otherFiles.map((f) => `/uploads/products/${f.filename}`);

    await this.prisma.productImage.deleteMany({
      where: { productId },
    });

    const rows = [
      {
        productId,
        url: mainUrl,
        isMain: true,
        sortOrder: 0,
      },
      ...otherUrls.map((url, idx) => ({
        productId,
        url,
        isMain: false,
        sortOrder: idx + 1,
      })),
    ];

    await this.prisma.productImage.createMany({ data: rows });

    await this.prisma.product.update({
      where: { id: productId },
      data: { imageUrl: mainUrl },
    });

    return this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        imageUrl: true,
        images: {
          select: { id: true, url: true, isMain: true, sortOrder: true },
          orderBy: [
            { isMain: 'desc' },
            { sortOrder: 'asc' },
            { createdAt: 'asc' },
          ],
        },
      },
    });
  }

  // ADD: добавляет файлы. Если main нет — первый файл станет main.
  async addProductImages(input: {
    restaurantId: string;
    productId: string;
    files: Express.Multer.File[];
  }) {
    const { restaurantId, productId, files } = input;

    const product = await this.prisma.product.findFirst({
      where: { id: productId, restaurantId },
      select: { id: true },
    });

    if (!product)
      throw new NotFoundException(
        'Товар не найден или не принадлежит ресторану',
      );

    const incoming = Array.isArray(files) ? files : [];
    if (!incoming.length) throw new BadRequestException('files пустой');

    if (incoming.length > 10) {
      throw new BadRequestException('Можно максимум 10 файлов за раз');
    }

    const existing = await this.prisma.productImage.findMany({
      where: { productId },
      select: { id: true, isMain: true, sortOrder: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    if (existing.length + incoming.length > 11) {
      throw new BadRequestException(
        'Лимит: максимум 11 фото (1 main + до 10 других)',
      );
    }

    const urls = incoming.map((f) => `/uploads/products/${f.filename}`);
    const hasMain = existing.some((x) => x.isMain);

    // следующий sortOrder для non-main
    const maxSort = existing.reduce(
      (acc, x) => Math.max(acc, x.sortOrder ?? 0),
      0,
    );
    let nextSort = maxSort + 1;

    // небольшая оптимизация: создаём пачкой
    if (!hasMain) {
      const [first, ...rest] = urls;

      await this.prisma.productImage.create({
        data: { productId, url: first, isMain: true, sortOrder: 0 },
      });

      if (rest.length) {
        await this.prisma.productImage.createMany({
          data: rest.map((u) => ({
            productId,
            url: u,
            isMain: false,
            sortOrder: nextSort++,
          })),
        });
      }

      await this.prisma.product.update({
        where: { id: productId },
        data: { imageUrl: first },
      });
    } else {
      await this.prisma.productImage.createMany({
        data: urls.map((u) => ({
          productId,
          url: u,
          isMain: false,
          sortOrder: nextSort++,
        })),
      });
    }

    return this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        imageUrl: true,
        images: {
          select: { id: true, url: true, isMain: true, sortOrder: true },
          orderBy: [
            { isMain: 'desc' },
            { sortOrder: 'asc' },
            { createdAt: 'asc' },
          ],
        },
      },
    });
  }

  // SET MAIN (атомарно + нормализация sortOrder)
  async setMainProductImage(input: {
    restaurantId: string;
    productId: string;
    imageId: string;
  }) {
    const { restaurantId, productId, imageId } = input;

    const product = await this.prisma.product.findFirst({
      where: { id: productId, restaurantId },
      select: { id: true },
    });

    if (!product)
      throw new NotFoundException(
        'Товар не найден или не принадлежит ресторану',
      );

    const img = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
      select: { id: true, url: true },
    });

    if (!img) throw new NotFoundException('Фото не найдено');

    await this.prisma.$transaction(async (tx) => {
      // сдвигаем текущий main, чтобы не было 2 записей с sortOrder=0
      await tx.productImage.updateMany({
        where: { productId, isMain: true },
        data: { sortOrder: 1 },
      });

      // снимаем main у всех
      await tx.productImage.updateMany({
        where: { productId },
        data: { isMain: false },
      });

      // назначаем выбранное как main
      await tx.productImage.update({
        where: { id: imageId },
        data: { isMain: true, sortOrder: 0 },
      });

      // нормализуем sortOrder остальных (1..n)
      const rest = await tx.productImage.findMany({
        where: { productId, id: { not: imageId } },
        select: { id: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });

      for (let i = 0; i < rest.length; i++) {
        await tx.productImage.update({
          where: { id: rest[i].id },
          data: { sortOrder: i + 1 },
        });
      }

      // совместимость
      await tx.product.update({
        where: { id: productId },
        data: { imageUrl: img.url },
      });
    });

    return this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        imageUrl: true,
        images: {
          select: { id: true, url: true, isMain: true, sortOrder: true },
          orderBy: [
            { isMain: 'desc' },
            { sortOrder: 'asc' },
            { createdAt: 'asc' },
          ],
        },
      },
    });
  }

  // DELETE IMAGE (атомарно + нормализация sortOrder)
  async deleteProductImage(input: {
    restaurantId: string;
    productId: string;
    imageId: string;
  }) {
    const { restaurantId, productId, imageId } = input;

    const product = await this.prisma.product.findFirst({
      where: { id: productId, restaurantId },
      select: { id: true },
    });

    if (!product)
      throw new NotFoundException(
        'Товар не найден или не принадлежит ресторану',
      );

    const img = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
      select: { id: true, isMain: true },
    });

    if (!img) throw new NotFoundException('Фото не найдено');

    await this.prisma.$transaction(async (tx) => {
      await tx.productImage.delete({ where: { id: imageId } });

      const remaining = await tx.productImage.findMany({
        where: { productId },
        select: { id: true, url: true, isMain: true, sortOrder: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });

      if (!remaining.length) {
        await tx.product.update({
          where: { id: productId },
          data: { imageUrl: null },
        });
        return;
      }

      // гарантируем, что есть main
      if (img.isMain) {
        const newMain = remaining[0];

        await tx.productImage.updateMany({
          where: { productId },
          data: { isMain: false },
        });

        await tx.productImage.update({
          where: { id: newMain.id },
          data: { isMain: true, sortOrder: 0 },
        });

        await tx.product.update({
          where: { id: productId },
          data: { imageUrl: newMain.url },
        });

        const rest = remaining.filter((x) => x.id !== newMain.id);
        for (let i = 0; i < rest.length; i++) {
          await tx.productImage.update({
            where: { id: rest[i].id },
            data: { sortOrder: i + 1 },
          });
        }
      } else {
        // если main вдруг отсутствует/сломался — восстановим
        let main = remaining.find((x) => x.isMain) || null;

        if (!main) {
          main = remaining[0];

          await tx.productImage.updateMany({
            where: { productId },
            data: { isMain: false },
          });

          await tx.productImage.update({
            where: { id: main.id },
            data: { isMain: true, sortOrder: 0 },
          });

          await tx.product.update({
            where: { id: productId },
            data: { imageUrl: main.url },
          });
        } else {
          // если main есть — убедимся, что sortOrder=0 именно у него
          await tx.productImage.update({
            where: { id: main.id },
            data: { sortOrder: 0 },
          });
        }

        const rest = remaining.filter((x) => x.id !== main!.id);
        for (let i = 0; i < rest.length; i++) {
          await tx.productImage.update({
            where: { id: rest[i].id },
            data: { sortOrder: i + 1 },
          });
        }
      }
    });

    return this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        imageUrl: true,
        images: {
          select: { id: true, url: true, isMain: true, sortOrder: true },
          orderBy: [
            { isMain: 'desc' },
            { sortOrder: 'asc' },
            { createdAt: 'asc' },
          ],
        },
      },
    });
  }

  async deleteProduct(input: { restaurantId: string; productId: string }) {
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