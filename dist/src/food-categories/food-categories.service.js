"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FoodCategoriesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
function slugifyBase(input) {
    return input
        .toLowerCase()
        .replace(/[^a-z0-9а-яё\s-]/gi, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}
function withRand(base) {
    const rand = Math.random().toString(16).slice(2, 6);
    return `${base}-${rand}`;
}
let FoodCategoriesService = class FoodCategoriesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const restaurantId = dto.restaurantId?.trim();
        if (!restaurantId)
            throw new common_1.BadRequestException('restaurantId обязателен');
        if (!dto.titleRu?.trim())
            throw new common_1.BadRequestException('titleRu обязателен');
        const titleRu = dto.titleRu.trim();
        const titleKk = dto.titleKk?.trim() || titleRu;
        const base = slugifyBase(titleRu) || 'cat';
        let code = dto.code?.trim() || withRand(base);
        for (let attempt = 0; attempt < 7; attempt++) {
            try {
                return await this.prisma.foodCategory.create({
                    data: {
                        restaurantId,
                        code,
                        titleRu,
                        titleKk,
                        iconUrl: dto.iconUrl ?? null,
                        sortOrder: dto.sortOrder ?? 0,
                    },
                });
            }
            catch (e) {
                if (e?.code === 'P2002') {
                    code = withRand(base);
                    continue;
                }
                throw e;
            }
        }
        throw new common_1.ConflictException('Не удалось сгенерировать уникальный code категории');
    }
    async listByRestaurant(restaurantId) {
        if (!restaurantId)
            throw new common_1.BadRequestException('restaurantId обязателен');
        return this.prisma.foodCategory.findMany({
            where: { restaurantId },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        });
    }
    async update(input) {
        const { restaurantId, categoryId, dto } = input;
        const category = await this.prisma.foodCategory.findFirst({
            where: { id: categoryId, restaurantId },
        });
        if (!category)
            throw new common_1.NotFoundException('Категория не найдена или не принадлежит ресторану');
        return this.prisma.foodCategory.update({
            where: { id: categoryId },
            data: dto,
        });
    }
    async delete(input) {
        const { restaurantId, categoryId, force } = input;
        const category = await this.prisma.foodCategory.findFirst({
            where: { id: categoryId, restaurantId },
        });
        if (!category)
            throw new common_1.NotFoundException('Категория не найдена или не принадлежит ресторану');
        const productsCount = await this.prisma.product.count({
            where: { categoryId, restaurantId },
        });
        if (productsCount > 0 && !force) {
            throw new common_1.ConflictException({
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
};
exports.FoodCategoriesService = FoodCategoriesService;
exports.FoodCategoriesService = FoodCategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FoodCategoriesService);
//# sourceMappingURL=food-categories.service.js.map