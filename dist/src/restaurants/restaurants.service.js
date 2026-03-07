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
exports.RestaurantsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let RestaurantsService = class RestaurantsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    FINANCE_CONFIG_ID = 'main';
    async getOrCreateFinanceConfig() {
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
    validatePct(pct) {
        if (!Number.isFinite(pct)) {
            throw new common_1.BadRequestException('pct must be number');
        }
        if (pct < 0 || pct > 100) {
            throw new common_1.BadRequestException('pct must be between 0 and 100');
        }
    }
    validateNonNegativeInt(v, field) {
        if (!Number.isFinite(v)) {
            throw new common_1.BadRequestException(`${field} must be number`);
        }
        if (!Number.isInteger(v)) {
            throw new common_1.BadRequestException(`${field} must be integer`);
        }
        if (v < 0) {
            throw new common_1.BadRequestException(`${field} must be >= 0`);
        }
    }
    async getFinanceConfig() {
        const cfg = await this.getOrCreateFinanceConfig();
        return cfg;
    }
    async updateFinanceConfig(dto) {
        const data = {};
        if (dto.clientDeliveryFeeDefault !== undefined) {
            if (typeof dto.clientDeliveryFeeDefault !== 'number') {
                throw new common_1.BadRequestException('clientDeliveryFeeDefault must be number');
            }
            this.validateNonNegativeInt(dto.clientDeliveryFeeDefault, 'clientDeliveryFeeDefault');
            data.clientDeliveryFeeDefault = dto.clientDeliveryFeeDefault;
        }
        if (dto.clientDeliveryFeeWeather !== undefined) {
            if (typeof dto.clientDeliveryFeeWeather !== 'number') {
                throw new common_1.BadRequestException('clientDeliveryFeeWeather must be number');
            }
            this.validateNonNegativeInt(dto.clientDeliveryFeeWeather, 'clientDeliveryFeeWeather');
            data.clientDeliveryFeeWeather = dto.clientDeliveryFeeWeather;
        }
        if (dto.courierPayoutDefault !== undefined) {
            if (typeof dto.courierPayoutDefault !== 'number') {
                throw new common_1.BadRequestException('courierPayoutDefault must be number');
            }
            this.validateNonNegativeInt(dto.courierPayoutDefault, 'courierPayoutDefault');
            data.courierPayoutDefault = dto.courierPayoutDefault;
        }
        if (dto.courierPayoutWeather !== undefined) {
            if (typeof dto.courierPayoutWeather !== 'number') {
                throw new common_1.BadRequestException('courierPayoutWeather must be number');
            }
            this.validateNonNegativeInt(dto.courierPayoutWeather, 'courierPayoutWeather');
            data.courierPayoutWeather = dto.courierPayoutWeather;
        }
        if (dto.courierCommissionPctDefault !== undefined) {
            if (typeof dto.courierCommissionPctDefault !== 'number') {
                throw new common_1.BadRequestException('courierCommissionPctDefault must be number');
            }
            this.validatePct(dto.courierCommissionPctDefault);
            data.courierCommissionPctDefault = dto.courierCommissionPctDefault;
        }
        if (dto.restaurantCommissionPctDefault !== undefined) {
            if (typeof dto.restaurantCommissionPctDefault !== 'number') {
                throw new common_1.BadRequestException('restaurantCommissionPctDefault must be number');
            }
            this.validatePct(dto.restaurantCommissionPctDefault);
            data.restaurantCommissionPctDefault = dto.restaurantCommissionPctDefault;
        }
        if (dto.weatherEnabled !== undefined) {
            if (typeof dto.weatherEnabled !== 'boolean') {
                throw new common_1.BadRequestException('weatherEnabled must be boolean');
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
    async getRestaurantCommissionDefault() {
        const cfg = await this.getOrCreateFinanceConfig();
        return {
            restaurantCommissionPctDefault: cfg.restaurantCommissionPctDefault,
            updatedAt: cfg.updatedAt,
        };
    }
    async setRestaurantCommissionDefault(restaurantCommissionPctDefault) {
        if (typeof restaurantCommissionPctDefault !== 'number') {
            throw new common_1.BadRequestException('restaurantCommissionPctDefault must be number');
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
    async findAll(q, status) {
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
            let runtimeStatus = 'CLOSED';
            if (r.status === 'OPEN' && r.workingHours) {
                const parts = r.workingHours.split('-').map((s) => s.trim());
                if (parts.length === 2) {
                    const [start, end] = parts;
                    const [sh, sm] = start.split(':').map((x) => Number(x));
                    const [eh, em] = end.split(':').map((x) => Number(x));
                    if (Number.isFinite(sh) &&
                        Number.isFinite(sm) &&
                        Number.isFinite(eh) &&
                        Number.isFinite(em)) {
                        const startMin = sh * 60 + sm;
                        const endMin = eh * 60 + em;
                        if (endMin >= startMin) {
                            if (currentMinutes >= startMin && currentMinutes <= endMin) {
                                runtimeStatus = 'OPEN';
                            }
                        }
                        else {
                            if (currentMinutes >= startMin || currentMinutes <= endMin) {
                                runtimeStatus = 'OPEN';
                            }
                        }
                    }
                }
            }
            const effectiveRestaurantCommissionPct = typeof r.restaurantCommissionPctOverride === 'number'
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
    async create(dto) {
        const nameRu = dto.nameRu?.trim();
        const nameKk = dto.nameKk?.trim();
        if (!nameRu) {
            throw new common_1.BadRequestException('nameRu is required');
        }
        if (!nameKk) {
            throw new common_1.BadRequestException('nameKk is required');
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
    async setInApp(id, isInApp) {
        if (typeof isInApp !== 'boolean') {
            throw new common_1.BadRequestException('isInApp must be boolean');
        }
        const exists = await this.prisma.restaurant.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!exists) {
            throw new common_1.NotFoundException('Restaurant not found');
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
    async setRestaurantCommissionOverride(id, restaurantCommissionPctOverride) {
        if (typeof restaurantCommissionPctOverride !== 'number' &&
            restaurantCommissionPctOverride !== null) {
            throw new common_1.BadRequestException('restaurantCommissionPctOverride must be number or null');
        }
        if (typeof restaurantCommissionPctOverride === 'number') {
            this.validatePct(restaurantCommissionPctOverride);
        }
        const exists = await this.prisma.restaurant.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!exists) {
            throw new common_1.NotFoundException('Restaurant not found');
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
        const effectiveRestaurantCommissionPct = typeof updated.restaurantCommissionPctOverride === 'number'
            ? updated.restaurantCommissionPctOverride
            : cfg.restaurantCommissionPctDefault ?? 0;
        return {
            ...updated,
            effectiveRestaurantCommissionPct,
        };
    }
    async resetRestaurantCommissionOverride(id) {
        return this.setRestaurantCommissionOverride(id, null);
    }
    async remove(id) {
        const exists = await this.prisma.restaurant.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!exists) {
            throw new common_1.NotFoundException('Restaurant not found');
        }
        await this.prisma.restaurant.delete({
            where: { id },
        });
        return { ok: true };
    }
    async list(opts) {
        const where = { status: 'OPEN', isInApp: true };
        const pinned = await this.prisma.restaurant.findMany({
            where: { ...where, isPinned: true },
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
        const others = await this.prisma.restaurant.findMany({
            where: { ...where, isPinned: false },
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
        const isOpenNow = (workingHours) => {
            if (!workingHours)
                return false;
            const parts = workingHours.split('-').map((s) => s.trim());
            if (parts.length !== 2)
                return false;
            const [start, end] = parts;
            const [sh, sm] = start.split(':').map((x) => Number(x));
            const [eh, em] = end.split(':').map((x) => Number(x));
            if (!Number.isFinite(sh) ||
                !Number.isFinite(sm) ||
                !Number.isFinite(eh) ||
                !Number.isFinite(em)) {
                return false;
            }
            const startMin = sh * 60 + sm;
            const endMin = eh * 60 + em;
            if (endMin >= startMin) {
                return currentMinutes >= startMin && currentMinutes <= endMin;
            }
            return currentMinutes >= startMin || currentMinutes <= endMin;
        };
        const pinnedOpen = pinned.filter((r) => r.status === 'OPEN' && r.isInApp === true && isOpenNow(r.workingHours));
        const othersOpen = others.filter((r) => r.status === 'OPEN' && r.isInApp === true && isOpenNow(r.workingHours));
        const finalOthers = opts.random ? this.shuffle(othersOpen) : othersOpen;
        return {
            pinned: pinnedOpen,
            items: [...pinnedOpen, ...finalOthers],
        };
    }
    async getOne(id) {
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
            throw new common_1.NotFoundException('Restaurant not found');
        }
        const cfg = await this.getOrCreateFinanceConfig();
        const effectiveRestaurantCommissionPct = typeof restaurant.restaurantCommissionPctOverride === 'number'
            ? restaurant.restaurantCommissionPctOverride
            : cfg.restaurantCommissionPctDefault ?? 0;
        return {
            ...restaurant,
            effectiveRestaurantCommissionPct,
        };
    }
    async products(restaurantId, opts) {
        const exists = await this.prisma.restaurant.findUnique({
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
        if (!exists)
            throw new common_1.NotFoundException('Restaurant not found');
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
    buildStableSlug(nameRu, phone) {
        const base = this.slugify(nameRu);
        const phoneDigits = (phone || '').replace(/\D/g, '');
        const suffix = phoneDigits ? phoneDigits.slice(-6) : 'no-phone';
        return `${base}-${suffix}`;
    }
    slugify(s) {
        return (s
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\p{L}\p{N}-]+/gu, '')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '') || 'restaurant');
    }
    shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }
    getCurrentMinutesInTimeZone(timeZone) {
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
};
exports.RestaurantsService = RestaurantsService;
exports.RestaurantsService = RestaurantsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RestaurantsService);
//# sourceMappingURL=restaurants.service.js.map