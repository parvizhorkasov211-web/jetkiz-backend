import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly FINANCE_CONFIG_ID = 'main';

  // ======================================================
  // FINANCE CONFIG (ensure exists)
  // ======================================================
  private async getOrCreateFinanceConfig() {
    return this.prisma.financeConfig.upsert({
      where: { id: this.FINANCE_CONFIG_ID },
      update: {},
      create: {
        id: this.FINANCE_CONFIG_ID,
      },
      select: {
        id: true,
        clientDeliveryFeeDefault: true,
        clientDeliveryFeeWeather: true,
        courierPayoutDefault: true,
        courierPayoutWeather: true,
        courierCommissionPctDefault: true,
        weatherEnabled: true,
        restaurantCommissionPctDefault: true,
        updatedAt: true,
      },
    });
  }

  private validatePct(pct: number) {
    if (!Number.isFinite(pct)) {
      throw new BadRequestException('pct must be number');
    }
    if (pct < 0 || pct > 100) {
      throw new BadRequestException('pct must be between 0 and 100');
    }
  }

  private validateNonNegativeInt(v: number, field: string) {
    if (!Number.isFinite(v)) {
      throw new BadRequestException(`${field} must be number`);
    }
    if (!Number.isInteger(v)) {
      throw new BadRequestException(`${field} must be integer`);
    }
    if (v < 0) {
      throw new BadRequestException(`${field} must be >= 0`);
    }
  }

  // ======================================================
  // ✅ FINANCE CONFIG (admin global tariff)
  // ======================================================
  async getFinanceConfig() {
    const cfg = await this.getOrCreateFinanceConfig();
    return cfg;
  }

  async updateFinanceConfig(dto: {
    clientDeliveryFeeDefault?: number;
    clientDeliveryFeeWeather?: number;
    courierPayoutDefault?: number;
    courierPayoutWeather?: number;
    courierCommissionPctDefault?: number;
    restaurantCommissionPctDefault?: number;
    weatherEnabled?: boolean;
  }) {
    const data: any = {};

    if (dto.clientDeliveryFeeDefault !== undefined) {
      if (typeof dto.clientDeliveryFeeDefault !== 'number') {
        throw new BadRequestException('clientDeliveryFeeDefault must be number');
      }
      this.validateNonNegativeInt(dto.clientDeliveryFeeDefault, 'clientDeliveryFeeDefault');
      data.clientDeliveryFeeDefault = dto.clientDeliveryFeeDefault;
    }

    if (dto.clientDeliveryFeeWeather !== undefined) {
      if (typeof dto.clientDeliveryFeeWeather !== 'number') {
        throw new BadRequestException('clientDeliveryFeeWeather must be number');
      }
      this.validateNonNegativeInt(dto.clientDeliveryFeeWeather, 'clientDeliveryFeeWeather');
      data.clientDeliveryFeeWeather = dto.clientDeliveryFeeWeather;
    }

    if (dto.courierPayoutDefault !== undefined) {
      if (typeof dto.courierPayoutDefault !== 'number') {
        throw new BadRequestException('courierPayoutDefault must be number');
      }
      this.validateNonNegativeInt(dto.courierPayoutDefault, 'courierPayoutDefault');
      data.courierPayoutDefault = dto.courierPayoutDefault;
    }

    if (dto.courierPayoutWeather !== undefined) {
      if (typeof dto.courierPayoutWeather !== 'number') {
        throw new BadRequestException('courierPayoutWeather must be number');
      }
      this.validateNonNegativeInt(dto.courierPayoutWeather, 'courierPayoutWeather');
      data.courierPayoutWeather = dto.courierPayoutWeather;
    }

    if (dto.courierCommissionPctDefault !== undefined) {
      if (typeof dto.courierCommissionPctDefault !== 'number') {
        throw new BadRequestException('courierCommissionPctDefault must be number');
      }
      this.validatePct(dto.courierCommissionPctDefault);
      data.courierCommissionPctDefault = dto.courierCommissionPctDefault;
    }

    if (dto.restaurantCommissionPctDefault !== undefined) {
      if (typeof dto.restaurantCommissionPctDefault !== 'number') {
        throw new BadRequestException('restaurantCommissionPctDefault must be number');
      }
      this.validatePct(dto.restaurantCommissionPctDefault);
      data.restaurantCommissionPctDefault = dto.restaurantCommissionPctDefault;
    }

    if (dto.weatherEnabled !== undefined) {
      if (typeof dto.weatherEnabled !== 'boolean') {
        throw new BadRequestException('weatherEnabled must be boolean');
      }
      data.weatherEnabled = dto.weatherEnabled;
    }

    if (Object.keys(data).length === 0) {
      return this.getFinanceConfig();
    }

    return this.prisma.financeConfig.upsert({
      where: { id: this.FINANCE_CONFIG_ID },
      update: data,
      create: {
        id: this.FINANCE_CONFIG_ID,
        ...data,
      },
      select: {
        id: true,
        clientDeliveryFeeDefault: true,
        clientDeliveryFeeWeather: true,
        courierPayoutDefault: true,
        courierPayoutWeather: true,
        courierCommissionPctDefault: true,
        restaurantCommissionPctDefault: true,
        weatherEnabled: true,
        updatedAt: true,
      },
    });
  }

  // ======================================================
  // COMMISSION DEFAULT (global)
  // ======================================================
  async getRestaurantCommissionDefault() {
    const cfg = await this.getOrCreateFinanceConfig();
    return {
      restaurantCommissionPctDefault: cfg.restaurantCommissionPctDefault,
      updatedAt: cfg.updatedAt,
    };
  }

  async setRestaurantCommissionDefault(restaurantCommissionPctDefault?: number) {
    if (typeof restaurantCommissionPctDefault !== 'number') {
      throw new BadRequestException(
        'restaurantCommissionPctDefault must be number',
      );
    }
    this.validatePct(restaurantCommissionPctDefault);

    return this.prisma.financeConfig.upsert({
      where: { id: this.FINANCE_CONFIG_ID },
      update: { restaurantCommissionPctDefault },
      create: {
        id: this.FINANCE_CONFIG_ID,
        restaurantCommissionPctDefault,
      },
      select: {
        restaurantCommissionPctDefault: true,
        updatedAt: true,
      },
    });
  }

  // ======================================================
  // ADMIN LIST
  // ======================================================
  async findAll(q?: string, status?: 'OPEN' | 'CLOSED') {
    const isNumber = q && !isNaN(Number(q));

    const cfg = await this.getOrCreateFinanceConfig();
    const defaultCommissionPct = cfg.restaurantCommissionPctDefault ?? 0;

    const restaurants = await this.prisma.restaurant.findMany({
      where: {
        AND: [
          q
            ? {
                OR: [
                  { nameRu: { contains: q, mode: 'insensitive' } },
                  { nameKk: { contains: q, mode: 'insensitive' } },
                  ...(isNumber ? [{ number: Number(q) }] : []),
                ],
              }
            : {},
        ],
      },
      orderBy: [{ number: 'desc' }],
      select: {
        id: true,
        number: true,
        slug: true,
        nameRu: true,
        nameKk: true,
        phone: true,
        address: true,
        workingHours: true,
        coverImageUrl: true,
        ratingAvg: true,
        ratingCount: true,
        status: true,
        isInApp: true,
        restaurantCommissionPctOverride: true,
        isPinned: true,
        sortOrder: true,
        useRandom: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const timeZone = process.env.APP_TIMEZONE || 'Asia/Almaty';
    const currentMinutes = this.getCurrentMinutesInTimeZone(timeZone);

    const mapped = restaurants.map((r) => {
      let runtimeStatus: 'OPEN' | 'CLOSED' = 'CLOSED';

      if (r.status === 'OPEN' && r.workingHours) {
        const parts = r.workingHours.split('-').map((s) => s.trim());
        if (parts.length === 2) {
          const [start, end] = parts;

          const [sh, sm] = start.split(':').map((x) => Number(x));
          const [eh, em] = end.split(':').map((x) => Number(x));

          if (
            Number.isFinite(sh) &&
            Number.isFinite(sm) &&
            Number.isFinite(eh) &&
            Number.isFinite(em)
          ) {
            const startMin = sh * 60 + sm;
            const endMin = eh * 60 + em;

            if (endMin >= startMin) {
              if (currentMinutes >= startMin && currentMinutes <= endMin) {
                runtimeStatus = 'OPEN';
              }
            } else {
              if (currentMinutes >= startMin || currentMinutes <= endMin) {
                runtimeStatus = 'OPEN';
              }
            }
          }
        }
      }

      const effectiveRestaurantCommissionPct =
        typeof r.restaurantCommissionPctOverride === 'number'
          ? r.restaurantCommissionPctOverride
          : defaultCommissionPct;

      return {
        ...r,
        runtimeStatus,
        effectiveRestaurantCommissionPct,
      };
    });

    if (status) {
      return mapped.filter((r) => r.runtimeStatus === status);
    }

    return mapped;
  }

  // ======================================================
  // CREATE / UPSERT
  // ======================================================
  async create(dto: CreateRestaurantDto) {
    const nameRu = dto.nameRu?.trim();
    const nameKk = dto.nameKk?.trim();

    if (!nameRu) {
      throw new BadRequestException('nameRu is required');
    }
    if (!nameKk) {
      throw new BadRequestException('nameKk is required');
    }

    const slug = this.buildStableSlug(nameRu, dto.phone);

    return this.prisma.restaurant.upsert({
      where: { slug },
      update: {
        nameRu,
        nameKk,
        phone: dto.phone?.trim() || null,
        address: dto.address?.trim() || null,
        workingHours: dto.workingHours?.trim() || null,
        status: dto.status ?? 'OPEN',
      },
      create: {
        slug,
        nameRu,
        nameKk,
        phone: dto.phone?.trim() || null,
        address: dto.address?.trim() || null,
        workingHours: dto.workingHours?.trim() || null,
        status: dto.status ?? 'OPEN',
      },
      select: {
        id: true,
        number: true,
        slug: true,
        nameRu: true,
        nameKk: true,
        phone: true,
        address: true,
        workingHours: true,
        status: true,
        isInApp: true,
        restaurantCommissionPctOverride: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // ======================================================
  // IN-APP TOGGLE
  // ======================================================
  async setInApp(id: string, isInApp?: boolean) {
    if (typeof isInApp !== 'boolean') {
      throw new BadRequestException('isInApp must be boolean');
    }

    const exists = await this.prisma.restaurant.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Restaurant not found');
    }

    return this.prisma.restaurant.update({
      where: { id },
      data: { isInApp },
      select: {
        id: true,
        number: true,
        slug: true,
        nameRu: true,
        nameKk: true,
        phone: true,
        address: true,
        workingHours: true,
        status: true,
        isInApp: true,
        restaurantCommissionPctOverride: true,
        isPinned: true,
        sortOrder: true,
        useRandom: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // ======================================================
  // COMMISSION OVERRIDE
  // ======================================================
  async setRestaurantCommissionOverride(
    id: string,
    restaurantCommissionPctOverride?: number | null,
  ) {
    if (
      typeof restaurantCommissionPctOverride !== 'number' &&
      restaurantCommissionPctOverride !== null
    ) {
      throw new BadRequestException(
        'restaurantCommissionPctOverride must be number or null',
      );
    }

    if (typeof restaurantCommissionPctOverride === 'number') {
      this.validatePct(restaurantCommissionPctOverride);
    }

    const exists = await this.prisma.restaurant.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Restaurant not found');
    }

    const updated = await this.prisma.restaurant.update({
      where: { id },
      data: { restaurantCommissionPctOverride },
      select: {
        id: true,
        number: true,
        slug: true,
        nameRu: true,
        nameKk: true,
        phone: true,
        address: true,
        workingHours: true,
        status: true,
        isInApp: true,
        restaurantCommissionPctOverride: true,
        isPinned: true,
        sortOrder: true,
        useRandom: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const cfg = await this.getOrCreateFinanceConfig();
    const effectiveRestaurantCommissionPct =
      typeof updated.restaurantCommissionPctOverride === 'number'
        ? updated.restaurantCommissionPctOverride
        : cfg.restaurantCommissionPctDefault ?? 0;

    return {
      ...updated,
      effectiveRestaurantCommissionPct,
    };
  }

  // ======================================================
  // RESET OVERRIDE
  // ======================================================
  async resetRestaurantCommissionOverride(id: string) {
    return this.setRestaurantCommissionOverride(id, null);
  }

  // ======================================================
  // DELETE
  // ======================================================
  async remove(id: string) {
    const exists = await this.prisma.restaurant.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Restaurant not found');
    }

    await this.prisma.restaurant.delete({
      where: { id },
    });

    return { ok: true };
  }

  // ======================================================
  // CLIENT LIST FOR HOME
  // Только рестораны, отмеченные для главной
  // ======================================================
  async list(opts: { random: boolean }) {
    const where = {
      status: 'OPEN' as const,
      isInApp: true as const,
      isPinned: true as const,
    };

    const pinned = await this.prisma.restaurant.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        number: true,
        slug: true,
        nameRu: true,
        nameKk: true,
        phone: true,
        address: true,
        workingHours: true,
        coverImageUrl: true,
        ratingAvg: true,
        ratingCount: true,
        status: true,
        isInApp: true,
        restaurantCommissionPctOverride: true,
        isPinned: true,
        sortOrder: true,
        useRandom: true,
      },
    });

    const timeZone = process.env.APP_TIMEZONE || 'Asia/Almaty';
    const currentMinutes = this.getCurrentMinutesInTimeZone(timeZone);

    const isOpenNow = (workingHours?: string | null) => {
      if (!workingHours) return false;

      const parts = workingHours.split('-').map((s) => s.trim());
      if (parts.length !== 2) return false;

      const [start, end] = parts;
      const [sh, sm] = start.split(':').map((x) => Number(x));
      const [eh, em] = end.split(':').map((x) => Number(x));

      if (
        !Number.isFinite(sh) ||
        !Number.isFinite(sm) ||
        !Number.isFinite(eh) ||
        !Number.isFinite(em)
      ) {
        return false;
      }

      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;

      if (endMin >= startMin) {
        return currentMinutes >= startMin && currentMinutes <= endMin;
      }

      return currentMinutes >= startMin || currentMinutes <= endMin;
    };

    const pinnedOpen = pinned.filter(
      (r) => r.status === 'OPEN' && r.isInApp === true && r.isPinned === true && isOpenNow(r.workingHours),
    );

    const finalPinned = opts.random ? this.shuffle(pinnedOpen) : pinnedOpen;

    return {
      pinned: finalPinned,
      items: finalPinned,
    };
  }

  // ======================================================
  // CLIENT LIST FOR RESTAURANTS SCREEN
  // Все открытые рестораны приложения, независимо от isPinned
  // ======================================================
  async publicAll(opts: { random: boolean }) {
    const restaurants = await this.prisma.restaurant.findMany({
      where: {
        status: 'OPEN',
        isInApp: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        number: true,
        slug: true,
        nameRu: true,
        nameKk: true,
        phone: true,
        address: true,
        workingHours: true,
        coverImageUrl: true,
        ratingAvg: true,
        ratingCount: true,
        status: true,
        isInApp: true,
        restaurantCommissionPctOverride: true,
        isPinned: true,
        sortOrder: true,
        useRandom: true,
      },
    });

    const timeZone = process.env.APP_TIMEZONE || 'Asia/Almaty';
    const currentMinutes = this.getCurrentMinutesInTimeZone(timeZone);

    const isOpenNow = (workingHours?: string | null) => {
      if (!workingHours) return false;

      const parts = workingHours.split('-').map((s) => s.trim());
      if (parts.length !== 2) return false;

      const [start, end] = parts;
      const [sh, sm] = start.split(':').map((x) => Number(x));
      const [eh, em] = end.split(':').map((x) => Number(x));

      if (
        !Number.isFinite(sh) ||
        !Number.isFinite(sm) ||
        !Number.isFinite(eh) ||
        !Number.isFinite(em)
      ) {
        return false;
      }

      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;

      if (endMin >= startMin) {
        return currentMinutes >= startMin && currentMinutes <= endMin;
      }

      return currentMinutes >= startMin || currentMinutes <= endMin;
    };

    const openNow = restaurants.filter(
      (r) => r.status === 'OPEN' && r.isInApp === true && isOpenNow(r.workingHours),
    );

    const items = opts.random ? this.shuffle(openNow) : openNow;

    return {
      items,
    };
  }

  // ======================================================
  // GET ONE
  // ======================================================
  async getOne(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      select: {
        id: true,
        number: true,
        slug: true,
        nameRu: true,
        nameKk: true,
        descriptionRu: true,
        descriptionKk: true,
        phone: true,
        address: true,
        workingHours: true,
        coverImageUrl: true,
        ratingAvg: true,
        ratingCount: true,
        status: true,
        isInApp: true,
        restaurantCommissionPctOverride: true,
        isPinned: true,
        sortOrder: true,
        useRandom: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const cfg = await this.getOrCreateFinanceConfig();
    const effectiveRestaurantCommissionPct =
      typeof restaurant.restaurantCommissionPctOverride === 'number'
        ? restaurant.restaurantCommissionPctOverride
        : cfg.restaurantCommissionPctDefault ?? 0;

    return {
      ...restaurant,
      effectiveRestaurantCommissionPct,
    };
  }

  // ======================================================
  // PRODUCTS / MENU
  // ======================================================
  async products(restaurantId: string, opts: { includeUnavailable: boolean }) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        number: true,
        status: true,
        nameRu: true,
        nameKk: true,
        slug: true,
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const categories = await this.prisma.foodCategory.findMany({
      where: { restaurantId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        code: true,
        titleRu: true,
        titleKk: true,
        sortOrder: true,
        iconUrl: true,
      },
    });

    const products = await this.prisma.product.findMany({
      where: {
        restaurantId,
        ...(opts.includeUnavailable ? {} : { isAvailable: true }),
      },
      orderBy: [
        { category: { sortOrder: 'asc' } },
        { createdAt: 'desc' },
      ],
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
        images: {
          orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            url: true,
            isMain: true,
            sortOrder: true,
          },
        },
      },
    });

    const items = products.map((p) => {
      const mainImage = p.images.find((img) => img.isMain);

      return {
        id: p.id,
        titleRu: p.titleRu,
        titleKk: p.titleKk,
        price: p.price,
        imageUrl: mainImage?.url || p.imageUrl || null,
        isAvailable: p.isAvailable,
        categoryId: p.categoryId ?? null,
        categoryNameRu: p.category?.titleRu ?? null,
        categoryNameKk: p.category?.titleKk ?? null,
        categoryCode: p.category?.code ?? null,
        categorySortOrder: p.category?.sortOrder ?? 0,
        weight: p.weight ?? null,
        composition: p.composition ?? null,
        description: p.description ?? null,
        isDrink: p.isDrink,
        images: p.images,
      };
    });

    return {
      restaurant,
      categories,
      items,
      products: items,
    };
  }

  private buildStableSlug(nameRu: string, phone?: string) {
    const base = this.slugify(nameRu);
    const phoneDigits = (phone || '').replace(/\D/g, '');
    const suffix = phoneDigits ? phoneDigits.slice(-6) : 'no-phone';
    return `${base}-${suffix}`;
  }

  private slugify(s: string) {
    return (
      s
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\p{L}\p{N}-]+/gu, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'restaurant'
    );
  }

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  private getCurrentMinutesInTimeZone(timeZone: string) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());

    const hh = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
    const mm = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');

    return hh * 60 + mm;
  }

  async setCoverImage(id: string, coverImageUrl: string) {
    if (!coverImageUrl?.trim()) {
      throw new BadRequestException('coverImageUrl is required');
    }

    const exists = await this.prisma.restaurant.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Restaurant not found');
    }

    return this.prisma.restaurant.update({
      where: { id },
      data: { coverImageUrl },
      select: {
        id: true,
        number: true,
        slug: true,
        nameRu: true,
        nameKk: true,
        coverImageUrl: true,
        updatedAt: true,
      },
    });
  }

  /**
   * ⭐ Показать ресторан на главной
   * Не влияет на раздел "Рестораны"
   */
  async setPinned(id: string, isPinned?: boolean, sortOrder?: number) {
    if (typeof isPinned !== 'boolean') {
      throw new BadRequestException('isPinned must be boolean');
    }

    const exists = await this.prisma.restaurant.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Restaurant not found');
    }

    return this.prisma.restaurant.update({
      where: { id },
      data: {
        isPinned,
        ...(typeof sortOrder === 'number' ? { sortOrder } : {}),
      },
      select: {
        id: true,
        number: true,
        slug: true,
        nameRu: true,
        nameKk: true,
        coverImageUrl: true,
        isPinned: true,
        sortOrder: true,
        updatedAt: true,
      },
    });
  }
}