import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type SavePromoDto = {
  promoTitleRu?: string | null;
  promoTitleKk?: string | null;
  promoImageUrl?: string | null;
  promoIsActive?: boolean;
};

type SaveCategoryDto = {
  id?: string;
  titleRu?: string;
  titleKk?: string;
  imageUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

type HomeCmsConfigRow = {
  id: string;
  promoTitleRu: string | null;
  promoTitleKk: string | null;
  promoImageUrl: string | null;
  promoIsActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type HomeCmsCategoryRow = {
  id: string;
  configId: string;
  titleRu: string;
  titleKk: string;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class HomeCmsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly CONFIG_ID = 'main';

  private q(value: unknown) {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
    const s = String(value).replace(/'/g, "''");
    return `'${s}'`;
  }

  private async ensureConfig() {
    await this.prisma.$executeRawUnsafe(`
      INSERT INTO "HomeCmsConfig" (
        "id",
        "promoIsActive",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${this.q(this.CONFIG_ID)},
        FALSE,
        NOW(),
        NOW()
      )
      ON CONFLICT ("id") DO NOTHING
    `);
  }

  private async getConfigRow(): Promise<HomeCmsConfigRow | null> {
    const rows = await this.prisma.$queryRawUnsafe<HomeCmsConfigRow[]>(`
      SELECT
        "id",
        "promoTitleRu",
        "promoTitleKk",
        "promoImageUrl",
        "promoIsActive",
        "createdAt",
        "updatedAt"
      FROM "HomeCmsConfig"
      WHERE "id" = ${this.q(this.CONFIG_ID)}
      LIMIT 1
    `);

    return rows[0] ?? null;
  }

  private async getCategoryRows(activeOnly: boolean): Promise<HomeCmsCategoryRow[]> {
    return this.prisma.$queryRawUnsafe<HomeCmsCategoryRow[]>(`
      SELECT
        "id",
        "configId",
        "titleRu",
        "titleKk",
        "imageUrl",
        "sortOrder",
        "isActive",
        "createdAt",
        "updatedAt"
      FROM "HomeCmsCategory"
      WHERE "configId" = ${this.q(this.CONFIG_ID)}
      ${activeOnly ? 'AND "isActive" = TRUE' : ''}
      ORDER BY "sortOrder" ASC, "createdAt" ASC
    `);
  }

  async getPublicHome() {
    await this.ensureConfig();

    const config = await this.getConfigRow();
    const categories = await this.getCategoryRows(true);

    const promoTitleRu = config?.promoTitleRu?.trim() || '';
    const promoTitleKk = config?.promoTitleKk?.trim() || '';
    const promoImageUrl = config?.promoImageUrl?.trim() || '';
    const promoIsActive = config?.promoIsActive === true;

    const hasPromo =
      promoIsActive &&
      (promoTitleRu.length > 0 ||
        promoTitleKk.length > 0 ||
        promoImageUrl.length > 0);

    return {
      promo: hasPromo
        ? {
            titleRu: promoTitleRu,
            titleKk: promoTitleKk,
            imageUrl: promoImageUrl || null,
            isActive: true,
          }
        : null,
      categories: categories.map((c) => ({
        id: c.id,
        titleRu: c.titleRu,
        titleKk: c.titleKk,
        imageUrl: c.imageUrl,
        sortOrder: c.sortOrder,
        isActive: c.isActive,
      })),
    };
  }

  async getAdminHome() {
    await this.ensureConfig();

    const config = await this.getConfigRow();
    const categories = await this.getCategoryRows(false);

    return {
      id: config?.id ?? this.CONFIG_ID,
      promoTitleRu: config?.promoTitleRu ?? '',
      promoTitleKk: config?.promoTitleKk ?? '',
      promoImageUrl: config?.promoImageUrl ?? '',
      promoIsActive: config?.promoIsActive ?? false,
      categories: categories.map((c) => ({
        id: c.id,
        titleRu: c.titleRu,
        titleKk: c.titleKk,
        imageUrl: c.imageUrl,
        sortOrder: c.sortOrder,
        isActive: c.isActive,
      })),
      updatedAt: config?.updatedAt ?? null,
    };
  }

  async savePromo(dto: SavePromoDto) {
    await this.ensureConfig();

    if (
      dto.promoIsActive !== undefined &&
      typeof dto.promoIsActive !== 'boolean'
    ) {
      throw new BadRequestException('promoIsActive must be boolean');
    }

    const current = await this.getConfigRow();

    const promoTitleRu =
      dto.promoTitleRu !== undefined
        ? dto.promoTitleRu?.trim() || null
        : current?.promoTitleRu ?? null;

    const promoTitleKk =
      dto.promoTitleKk !== undefined
        ? dto.promoTitleKk?.trim() || null
        : current?.promoTitleKk ?? null;

    const promoImageUrl =
      dto.promoImageUrl !== undefined
        ? dto.promoImageUrl?.trim() || null
        : current?.promoImageUrl ?? null;

    const promoIsActive =
      dto.promoIsActive !== undefined
        ? dto.promoIsActive
        : current?.promoIsActive ?? false;

    await this.prisma.$executeRawUnsafe(`
      UPDATE "HomeCmsConfig"
      SET
        "promoTitleRu" = ${this.q(promoTitleRu)},
        "promoTitleKk" = ${this.q(promoTitleKk)},
        "promoImageUrl" = ${this.q(promoImageUrl)},
        "promoIsActive" = ${this.q(promoIsActive)},
        "updatedAt" = NOW()
      WHERE "id" = ${this.q(this.CONFIG_ID)}
    `);

    return this.getAdminHome();
  }

  async saveCategories(input: { categories?: SaveCategoryDto[] }) {
    await this.ensureConfig();

    const categories = Array.isArray(input.categories) ? input.categories : [];

    for (const item of categories) {
      const titleRu = item.titleRu?.trim() || '';
      const titleKk = item.titleKk?.trim() || '';

      if (!titleRu) {
        throw new BadRequestException('Each category.titleRu is required');
      }

      if (!titleKk) {
        throw new BadRequestException('Each category.titleKk is required');
      }

      if (item.sortOrder !== undefined && !Number.isInteger(item.sortOrder)) {
        throw new BadRequestException(
          'Each category.sortOrder must be integer',
        );
      }

      if (item.isActive !== undefined && typeof item.isActive !== 'boolean') {
        throw new BadRequestException('Each category.isActive must be boolean');
      }
    }

    const existing = await this.getCategoryRows(false);
    const existingIds = new Set(existing.map((x) => x.id));
    const incomingIds = new Set(
      categories.map((x) => x.id).filter((x): x is string => Boolean(x)),
    );

    const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));

    await this.prisma.$executeRawUnsafe('BEGIN');

    try {
      if (toDelete.length > 0) {
        await this.prisma.$executeRawUnsafe(`
          DELETE FROM "HomeCmsCategory"
          WHERE "configId" = ${this.q(this.CONFIG_ID)}
            AND "id" IN (${toDelete.map((id) => this.q(id)).join(', ')})
        `);
      }

      for (let i = 0; i < categories.length; i++) {
        const item = categories[i];
        const sortOrder = item.sortOrder ?? i;
        const titleRu = item.titleRu!.trim();
        const titleKk = item.titleKk!.trim();
        const imageUrl = item.imageUrl?.trim() || null;
        const isActive = item.isActive ?? true;

        if (item.id) {
          await this.prisma.$executeRawUnsafe(`
            UPDATE "HomeCmsCategory"
            SET
              "titleRu" = ${this.q(titleRu)},
              "titleKk" = ${this.q(titleKk)},
              "imageUrl" = ${this.q(imageUrl)},
              "sortOrder" = ${this.q(sortOrder)},
              "isActive" = ${this.q(isActive)},
              "updatedAt" = NOW()
            WHERE "id" = ${this.q(item.id)}
          `);
        } else {
          await this.prisma.$executeRawUnsafe(`
            INSERT INTO "HomeCmsCategory" (
              "id",
              "configId",
              "titleRu",
              "titleKk",
              "imageUrl",
              "sortOrder",
              "isActive",
              "createdAt",
              "updatedAt"
            )
            VALUES (
              gen_random_uuid()::text,
              ${this.q(this.CONFIG_ID)},
              ${this.q(titleRu)},
              ${this.q(titleKk)},
              ${this.q(imageUrl)},
              ${this.q(sortOrder)},
              ${this.q(isActive)},
              NOW(),
              NOW()
            )
          `);
        }
      }

      await this.prisma.$executeRawUnsafe('COMMIT');
    } catch (e) {
      await this.prisma.$executeRawUnsafe('ROLLBACK');
      throw e;
    }

    return this.getAdminHome();
  }
}