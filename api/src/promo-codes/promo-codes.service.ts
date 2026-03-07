import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PromoCodeType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { ValidatePromoCodeDto } from './dto/validate-promo-code.dto';

@Injectable()
export class PromoCodesService {
  constructor(private readonly prisma: PrismaService) {}

  private generateCode(length = 8) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = 'JETKIZ-';

    for (let i = 0; i < length; i++) {
      out += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return out;
  }

  private async generateUniqueCode() {
    for (let i = 0; i < 20; i++) {
      const code = this.generateCode();

      const exists = await this.prisma.promoCode.findUnique({
        where: { code },
        select: { id: true },
      });

      if (!exists) return code;
    }

    throw new BadRequestException('Failed to generate unique promo code');
  }

  async create(dto: CreatePromoCodeDto) {
    let code = (dto.code ?? '').trim().toUpperCase();

    if (dto.autoGenerate || !code) {
      code = await this.generateUniqueCode();
    }

    if (dto.startsAt && dto.expiresAt && dto.startsAt > dto.expiresAt) {
      throw new BadRequestException('startsAt must be less than expiresAt');
    }

    const value = dto.type === PromoCodeType.FREE_DELIVERY ? 0 : dto.value;

    try {
      return await this.prisma.promoCode.create({
        data: {
          code,
          type: dto.type,
          value,
          isActive: dto.isActive ?? true,
          startsAt: dto.startsAt ?? null,
          expiresAt: dto.expiresAt ?? null,
          usageLimit: dto.usageLimit ?? null,
          perUserLimit: dto.perUserLimit ?? null,
          minOrderAmount: dto.minOrderAmount ?? null,
          maxDiscountAmount: dto.maxDiscountAmount ?? null,
          firstOrderOnly: dto.firstOrderOnly ?? false,
          restaurantId: dto.restaurantId ?? null,
        },
        select: {
          id: true,
          code: true,
          type: true,
          value: true,
          isActive: true,
          startsAt: true,
          expiresAt: true,
          usageLimit: true,
          usedCount: true,
          perUserLimit: true,
          minOrderAmount: true,
          maxDiscountAmount: true,
          firstOrderOnly: true,
          restaurantId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException('Promo code already exists');
      }
      throw e;
    }
  }

  async findAll() {
    return this.prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        type: true,
        value: true,
        isActive: true,
        startsAt: true,
        expiresAt: true,
        usageLimit: true,
        usedCount: true,
        perUserLimit: true,
        minOrderAmount: true,
        maxDiscountAmount: true,
        firstOrderOnly: true,
        restaurantId: true,
        createdAt: true,
        updatedAt: true,
        restaurant: {
          select: {
            id: true,
            nameRu: true,
            slug: true,
          },
        },
      },
    });
  }

  async toggle(id: string) {
    const found = await this.prisma.promoCode.findUnique({
      where: { id },
      select: { id: true, isActive: true },
    });

    if (!found) {
      throw new NotFoundException('Promo code not found');
    }

    return this.prisma.promoCode.update({
      where: { id },
      data: { isActive: !found.isActive },
      select: {
        id: true,
        code: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  async validate(dto: ValidatePromoCodeDto) {
    const code = dto.code.trim().toUpperCase();

    const promo = await this.prisma.promoCode.findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        type: true,
        value: true,
        isActive: true,
        startsAt: true,
        expiresAt: true,
        usageLimit: true,
        usedCount: true,
        perUserLimit: true,
        minOrderAmount: true,
        maxDiscountAmount: true,
        firstOrderOnly: true,
        restaurantId: true,
      },
    });

    if (!promo) {
      throw new NotFoundException('Promo code not found');
    }

    const now = new Date();

    if (!promo.isActive) {
      throw new BadRequestException('Promo code is inactive');
    }

    if (promo.startsAt && now < promo.startsAt) {
      throw new BadRequestException('Promo code is not active yet');
    }

    if (promo.expiresAt && now > promo.expiresAt) {
      throw new BadRequestException('Promo code has expired');
    }

    if (promo.usageLimit != null && promo.usedCount >= promo.usageLimit) {
      throw new BadRequestException('Promo code usage limit reached');
    }

    if (promo.restaurantId && promo.restaurantId !== dto.restaurantId) {
      throw new BadRequestException('Promo code is not valid for this restaurant');
    }

    if (promo.minOrderAmount != null && dto.subtotal < promo.minOrderAmount) {
      throw new BadRequestException('Minimum order amount not reached');
    }

    if (promo.perUserLimit != null) {
      const usedByUser = await this.prisma.promoCodeUsage.count({
        where: {
          promoCodeId: promo.id,
          userId: dto.userId,
        },
      });

      if (usedByUser >= promo.perUserLimit) {
        throw new BadRequestException('Per-user promo usage limit reached');
      }
    }

    if (promo.firstOrderOnly) {
      const ordersCount = await this.prisma.order.count({
        where: {
          userId: dto.userId,
          status: { not: 'CANCELED' },
        },
      });

      if (ordersCount > 0) {
        throw new BadRequestException('Promo code is only valid for first order');
      }
    }

    let discountAmount = 0;
    let deliveryDiscountAmount = 0;

    if (promo.type === PromoCodeType.PERCENT) {
      discountAmount = Math.floor((dto.subtotal * promo.value) / 100);

      if (promo.maxDiscountAmount != null) {
        discountAmount = Math.min(discountAmount, promo.maxDiscountAmount);
      }

      discountAmount = Math.min(discountAmount, dto.subtotal);
    }

    if (promo.type === PromoCodeType.FIXED) {
      discountAmount = Math.min(promo.value, dto.subtotal);
    }

    if (promo.type === PromoCodeType.FREE_DELIVERY) {
      deliveryDiscountAmount = Math.max(0, dto.deliveryFee);
    }

    const total = Math.max(
      0,
      dto.subtotal + dto.deliveryFee - discountAmount - deliveryDiscountAmount,
    );

    return {
      valid: true,
      promo: {
        id: promo.id,
        code: promo.code,
        type: promo.type,
        value: promo.value,
      },
      pricing: {
        subtotal: dto.subtotal,
        deliveryFee: dto.deliveryFee,
        discountAmount,
        deliveryDiscountAmount,
        total,
      },
    };
  }

  async markUsedTx(
    tx: Prisma.TransactionClient,
    params: {
      promoCodeId: string;
      userId: string;
      orderId: string;
      discountAmount: number;
      deliveryDiscountAmount: number;
    },
  ) {
    const promo = await tx.promoCode.findUnique({
      where: { id: params.promoCodeId },
      select: {
        id: true,
        isActive: true,
        startsAt: true,
        expiresAt: true,
        usageLimit: true,
        usedCount: true,
        perUserLimit: true,
      },
    });

    if (!promo) {
      throw new NotFoundException('Promo code not found');
    }

    const now = new Date();

    if (!promo.isActive) {
      throw new BadRequestException('Promo code is inactive');
    }

    if (promo.startsAt && now < promo.startsAt) {
      throw new BadRequestException('Promo code is not active yet');
    }

    if (promo.expiresAt && now > promo.expiresAt) {
      throw new BadRequestException('Promo code has expired');
    }

    if (promo.usageLimit != null && promo.usedCount >= promo.usageLimit) {
      throw new BadRequestException('Promo code usage limit reached');
    }

    if (promo.perUserLimit != null) {
      const usedByUser = await tx.promoCodeUsage.count({
        where: {
          promoCodeId: params.promoCodeId,
          userId: params.userId,
        },
      });

      if (usedByUser >= promo.perUserLimit) {
        throw new BadRequestException('Per-user promo usage limit reached');
      }
    }

    await tx.promoCodeUsage.create({
      data: {
        promoCodeId: params.promoCodeId,
        userId: params.userId,
        orderId: params.orderId,
        discountAmount: params.discountAmount,
        deliveryDiscountAmount: params.deliveryDiscountAmount,
      },
    });

    await tx.promoCode.update({
      where: { id: params.promoCodeId },
      data: {
        usedCount: {
          increment: 1,
        },
      },
    });
  }

  async markUsed(params: {
    promoCodeId: string;
    userId: string;
    orderId: string;
    discountAmount: number;
    deliveryDiscountAmount: number;
  }) {
    return this.prisma.$transaction((tx) => this.markUsedTx(tx, params));
  }
}