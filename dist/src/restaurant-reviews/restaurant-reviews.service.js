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
exports.RestaurantReviewsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
function parseYmd(s) {
    if (!s)
        return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
    if (!m)
        return null;
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    return new Date(y, mo, d);
}
function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function endOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}
let RestaurantReviewsService = class RestaurantReviewsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getRestaurantReviews(input) {
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: input.restaurantId },
            select: { id: true },
        });
        if (!restaurant)
            throw new common_1.NotFoundException('Ресторан не найден');
        const page = Math.max(1, input.page || 1);
        const limit = Math.min(100, Math.max(1, input.limit || 30));
        const skip = (page - 1) * limit;
        const dFrom = parseYmd(input.from);
        const dTo = parseYmd(input.to);
        const where = { restaurantId: input.restaurantId };
        if (dFrom && dTo) {
            where.createdAt = { gte: startOfDay(dFrom), lte: endOfDay(dTo) };
        }
        else if (dFrom) {
            where.createdAt = { gte: startOfDay(dFrom) };
        }
        else if (dTo) {
            where.createdAt = { lte: endOfDay(dTo) };
        }
        const [total, items] = await Promise.all([
            this.prisma.review.count({ where }),
            this.prisma.review.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    user: input.includeUser
                        ? { select: { id: true, phone: true, firstName: true, lastName: true } }
                        : false,
                    order: input.includeOrder
                        ? { select: { id: true, createdAt: true, total: true, status: true } }
                        : false,
                },
            }),
        ]);
        return {
            items,
            meta: { page, limit, total },
        };
    }
};
exports.RestaurantReviewsService = RestaurantReviewsService;
exports.RestaurantReviewsService = RestaurantReviewsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RestaurantReviewsService);
//# sourceMappingURL=restaurant-reviews.service.js.map