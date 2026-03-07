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
exports.ClientReviewsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ClientReviewsService = class ClientReviewsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getCustomerReviews(userId, opts) {
        const page = Math.max(1, opts.page || 1);
        const limit = Math.min(200, Math.max(1, opts.limit || 50));
        const skip = (page - 1) * limit;
        const where = {
            userId,
            orderId: { not: null },
            order: { status: 'DELIVERED' },
        };
        const [items, total] = await Promise.all([
            this.prisma.review.findMany({
                where: where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                select: {
                    id: true,
                    orderId: true,
                    restaurantId: true,
                    productId: true,
                    rating: true,
                    text: true,
                    createdAt: true,
                    ...(opts.includeOrder
                        ? {
                            order: {
                                select: {
                                    id: true,
                                    createdAt: true,
                                    total: true,
                                    status: true,
                                    restaurantId: true,
                                    paymentStatus: true,
                                    paymentMethod: true,
                                },
                            },
                        }
                        : {}),
                },
            }),
            this.prisma.review.count({ where: where }),
        ]);
        return {
            items,
            meta: { total, page, limit },
        };
    }
    async getCustomerReviewsAggregate(userId) {
        const where = {
            userId,
            orderId: { not: null },
            order: { status: 'DELIVERED' },
        };
        const agg = (await this.prisma.review.aggregate({
            where: where,
            _count: { _all: true },
            _avg: { rating: true },
        }));
        return {
            reviewsCount: agg?._count?._all ?? 0,
            avgRating: agg?._avg?.rating ?? null,
        };
    }
};
exports.ClientReviewsService = ClientReviewsService;
exports.ClientReviewsService = ClientReviewsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ClientReviewsService);
//# sourceMappingURL=client-reviews.service.js.map