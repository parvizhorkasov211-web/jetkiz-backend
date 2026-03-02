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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let OrdersService = class OrdersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    FIN_CONFIG_ID = 'main';
    DEFAULT_PROMISED_MIN = 45;
    computePromisedAt(base) {
        return new Date(base.getTime() + this.DEFAULT_PROMISED_MIN * 60_000);
    }
    isDigits(v) {
        return /^[0-9]+$/.test(String(v ?? '').trim());
    }
    parseOrderNumber(v) {
        if (!this.isDigits(v))
            return null;
        const n = Number(v);
        if (!Number.isFinite(n) || n <= 0)
            return null;
        return Math.trunc(n);
    }
    async resolveOrderUuid(orderIdOrNumber) {
        const num = this.parseOrderNumber(orderIdOrNumber);
        if (num == null)
            return orderIdOrNumber;
        const found = await this.prisma.order.findUnique({
            where: { number: num },
            select: { id: true },
        });
        if (!found)
            throw new common_1.NotFoundException('Order not found');
        return found.id;
    }
    ensureAdmin(user) {
        if ((user.role ?? 'CLIENT') !== 'ADMIN') {
            throw new common_1.ForbiddenException('Only admin');
        }
    }
    getOrCreateFinanceConfig() {
        return this.prisma.financeConfig.upsert({
            where: { id: this.FIN_CONFIG_ID },
            update: {},
            create: {
                id: this.FIN_CONFIG_ID,
                clientDeliveryFeeDefault: 1200,
                clientDeliveryFeeWeather: 1500,
                courierPayoutDefault: 1100,
                courierPayoutWeather: 1500,
                courierCommissionPctDefault: 15,
                restaurantCommissionPctDefault: 20,
                weatherEnabled: false,
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
    async getFinanceConfig(user) {
        this.ensureAdmin(user);
        return this.getOrCreateFinanceConfig();
    }
    async updateFinanceConfig(user, body) {
        this.ensureAdmin(user);
        const data = {};
        const n = (v) => Math.max(0, Math.round(Number(v) || 0));
        if (body.clientDeliveryFeeDefault != null)
            data.clientDeliveryFeeDefault = n(body.clientDeliveryFeeDefault);
        if (body.clientDeliveryFeeWeather != null)
            data.clientDeliveryFeeWeather = n(body.clientDeliveryFeeWeather);
        if (body.courierPayoutDefault != null)
            data.courierPayoutDefault = n(body.courierPayoutDefault);
        if (body.courierPayoutWeather != null)
            data.courierPayoutWeather = n(body.courierPayoutWeather);
        if (body.weatherEnabled != null)
            data.weatherEnabled = Boolean(body.weatherEnabled);
        await this.getOrCreateFinanceConfig();
        if (Object.keys(data).length === 0) {
            return this.getOrCreateFinanceConfig();
        }
        return this.prisma.financeConfig.update({
            where: { id: this.FIN_CONFIG_ID },
            data,
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
    async setManualDeliveryFee(user, orderIdOrNumber, deliveryFee) {
        this.ensureAdmin(user);
        const orderId = await this.resolveOrderUuid(orderIdOrNumber);
        const fee = Math.max(0, Math.round(Number(deliveryFee) || 0));
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            select: { id: true, subtotal: true },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        const total = Math.max(0, Math.round(Number(order.subtotal) || 0)) + fee;
        return this.prisma.order.update({
            where: { id: orderId },
            data: {
                deliveryFee: fee,
                total,
                pricingSource: client_1.PricingSource.MANUAL,
            },
            select: {
                id: true,
                number: true,
                subtotal: true,
                deliveryFee: true,
                total: true,
                pricingSource: true,
                updatedAt: true,
            },
        });
    }
    async computeClientDeliveryFeeApplied() {
        const cfg = await this.getOrCreateFinanceConfig();
        const weather = Boolean(cfg.weatherEnabled);
        const deliveryFee = weather
            ? cfg.clientDeliveryFeeWeather
            : cfg.clientDeliveryFeeDefault;
        return {
            deliveryFee: Math.max(0, Math.round(Number(deliveryFee) || 0)),
            pricingSource: weather
                ? client_1.PricingSource.AUTO_WEATHER
                : client_1.PricingSource.AUTO_DEFAULT,
        };
    }
    async computeCourierPayoutApplied(courierUserId) {
        const [cfg, courier] = await this.prisma.$transaction([
            this.getOrCreateFinanceConfig(),
            this.prisma.courierProfile.findUnique({
                where: { userId: courierUserId },
                select: { personalFeeOverride: true, payoutBonusAdd: true },
            }),
        ]);
        if (!courier)
            throw new common_1.NotFoundException('Courier not found');
        const weather = Boolean(cfg.weatherEnabled);
        let base = weather ? cfg.courierPayoutWeather : cfg.courierPayoutDefault;
        if (!weather && courier.personalFeeOverride != null) {
            base = courier.personalFeeOverride;
        }
        const bonus = Math.max(0, Math.round(Number(courier.payoutBonusAdd ?? 0) || 0));
        const courierFee = Math.max(0, Math.round(Number(base) || 0)) + bonus;
        return {
            courierFee,
            bonusApplied: bonus,
            pricingSource: weather
                ? client_1.PricingSource.AUTO_WEATHER
                : client_1.PricingSource.AUTO_DEFAULT,
        };
    }
    async getAdminOrderByNumber(number) {
        return this.getAdminOrderById(String(number));
    }
    async getOrderByNumber(userId, number) {
        return this.getOrderById(userId, String(number));
    }
    async createOrder(userId, dto) {
        if (!dto.items || dto.items.length === 0) {
            throw new common_1.BadRequestException('Cart is empty');
        }
        const productIds = dto.items.map((i) => i.productId);
        const products = await this.prisma.product.findMany({
            where: {
                id: { in: productIds },
                restaurantId: dto.restaurantId,
                isAvailable: true,
            },
            select: { id: true, price: true, titleRu: true },
        });
        if (products.length !== dto.items.length) {
            throw new common_1.BadRequestException('Some products are missing or unavailable');
        }
        const productMap = new Map(products.map((p) => [p.id, p]));
        let subtotal = 0;
        const itemsCreate = dto.items.map((item) => {
            const p = productMap.get(item.productId);
            if (!p)
                throw new common_1.BadRequestException('Invalid product in cart');
            subtotal += p.price * item.quantity;
            return {
                productId: p.id,
                title: p.titleRu,
                price: p.price,
                quantity: item.quantity,
            };
        });
        const { deliveryFee, pricingSource } = await this.computeClientDeliveryFeeApplied();
        const total = subtotal + deliveryFee;
        const createdAt = new Date();
        const promisedAt = this.computePromisedAt(createdAt);
        return this.prisma.order.create({
            data: {
                userId,
                restaurantId: dto.restaurantId,
                status: client_1.OrderStatus.CREATED,
                subtotal,
                deliveryFee,
                total,
                pricingSource,
                courierBonusApplied: 0,
                addressId: dto.addressId,
                phone: dto.phone,
                comment: dto.comment ?? null,
                leaveAtDoor: dto.leaveAtDoor,
                paymentMethod: 'CASH',
                paymentStatus: 'PENDING',
                items: { create: itemsCreate },
                createdAt,
                promisedAt,
            },
            include: {
                items: {
                    select: {
                        id: true,
                        productId: true,
                        title: true,
                        price: true,
                        quantity: true,
                    },
                },
                restaurant: {
                    select: {
                        id: true,
                        slug: true,
                        nameRu: true,
                        nameKk: true,
                        coverImageUrl: true,
                        status: true,
                    },
                },
            },
        });
    }
    async getMyOrders(userId, opts) {
        const skip = (opts.page - 1) * opts.limit;
        const take = opts.limit;
        const [total, orders] = await this.prisma.$transaction([
            this.prisma.order.count({ where: { userId } }),
            this.prisma.order.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip,
                take,
                select: {
                    id: true,
                    number: true,
                    createdAt: true,
                    status: true,
                    total: true,
                    paymentStatus: true,
                    courierId: true,
                    courierFee: true,
                    deliveryFee: true,
                    restaurant: {
                        select: {
                            id: true,
                            slug: true,
                            nameRu: true,
                            coverImageUrl: true,
                            ratingAvg: true,
                            ratingCount: true,
                            status: true,
                        },
                    },
                    items: { select: { title: true, quantity: true } },
                },
            }),
        ]);
        const items = orders.map((o) => ({
            id: o.id,
            number: o.number,
            createdAt: o.createdAt,
            status: o.status,
            total: o.total,
            paymentStatus: o.paymentStatus,
            restaurant: o.restaurant,
            courierId: o.courierId,
            courierFee: o.courierFee,
            deliveryFee: o.deliveryFee,
            itemsCount: o.items.length,
            previewItems: o.items.slice(0, 2),
        }));
        return { total, items };
    }
    async getOrderById(userId, orderIdOrNumber) {
        const num = this.parseOrderNumber(orderIdOrNumber);
        const where = {};
        if (num != null)
            where.number = num;
        else
            where.id = orderIdOrNumber;
        if (userId)
            where.userId = userId;
        const order = await this.prisma.order.findFirst({
            where,
            select: {
                id: true,
                number: true,
                userId: true,
                restaurantId: true,
                status: true,
                subtotal: true,
                deliveryFee: true,
                total: true,
                addressId: true,
                phone: true,
                comment: true,
                leaveAtDoor: true,
                paymentMethod: true,
                paymentStatus: true,
                ratingGiven: true,
                pricingSource: true,
                courierBonusApplied: true,
                courierId: true,
                courierFee: true,
                assignedAt: true,
                pickedUpAt: true,
                deliveredAt: true,
                createdAt: true,
                updatedAt: true,
                items: {
                    select: {
                        id: true,
                        productId: true,
                        title: true,
                        price: true,
                        quantity: true,
                    },
                },
                restaurant: {
                    select: {
                        id: true,
                        slug: true,
                        nameRu: true,
                        nameKk: true,
                        coverImageUrl: true,
                        status: true,
                    },
                },
                courier: {
                    select: {
                        userId: true,
                        firstName: true,
                        lastName: true,
                        isOnline: true,
                        user: { select: { phone: true } },
                    },
                },
            },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        return order;
    }
    async getAdminOrders(opts) {
        const skip = (opts.page - 1) * opts.limit;
        const take = opts.limit;
        const where = {};
        if (opts.status)
            where.status = opts.status;
        if (opts.q && opts.q.trim()) {
            const q = opts.q.trim();
            const num = this.parseOrderNumber(q);
            where.OR = [
                { phone: { contains: q } },
                { user: { phone: { contains: q } } },
                { id: { contains: q } },
                { restaurant: { nameRu: { contains: q, mode: 'insensitive' } } },
            ];
            if (num != null)
                where.OR.unshift({ number: num });
        }
        const [total, orders] = await this.prisma.$transaction([
            this.prisma.order.count({ where }),
            this.prisma.order.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take,
                select: {
                    id: true,
                    number: true,
                    createdAt: true,
                    status: true,
                    total: true,
                    paymentStatus: true,
                    deliveryFee: true,
                    courierFee: true,
                    pricingSource: true,
                    courierBonusApplied: true,
                    courierId: true,
                    assignedAt: true,
                    pickedUpAt: true,
                    deliveredAt: true,
                    restaurant: {
                        select: {
                            id: true,
                            slug: true,
                            nameRu: true,
                            coverImageUrl: true,
                            status: true,
                        },
                    },
                    courier: {
                        select: {
                            userId: true,
                            firstName: true,
                            lastName: true,
                            user: { select: { phone: true } },
                        },
                    },
                    user: {
                        select: { id: true, phone: true, firstName: true, lastName: true },
                    },
                    items: { select: { title: true, quantity: true } },
                },
            }),
        ]);
        const items = orders.map((o) => ({
            id: o.id,
            number: o.number,
            createdAt: o.createdAt,
            status: o.status,
            total: o.total,
            paymentStatus: o.paymentStatus,
            deliveryFee: o.deliveryFee,
            courierFee: o.courierFee,
            pricingSource: o.pricingSource,
            courierBonusApplied: o.courierBonusApplied,
            user: o.user,
            restaurant: o.restaurant,
            courierId: o.courierId,
            courier: o.courier ?? null,
            itemsCount: o.items.length,
            previewItems: o.items.slice(0, 2),
            assignedAt: o.assignedAt ?? null,
            pickedUpAt: o.pickedUpAt ?? null,
            deliveredAt: o.deliveredAt ?? null,
        }));
        return { total, items };
    }
    async getAdminOrderById(orderIdOrNumber) {
        const num = this.parseOrderNumber(orderIdOrNumber);
        const order = await this.prisma.order.findUnique({
            where: num != null ? { number: num } : { id: orderIdOrNumber },
            select: {
                id: true,
                number: true,
                userId: true,
                restaurantId: true,
                status: true,
                subtotal: true,
                deliveryFee: true,
                total: true,
                addressId: true,
                phone: true,
                comment: true,
                leaveAtDoor: true,
                paymentMethod: true,
                paymentStatus: true,
                ratingGiven: true,
                pricingSource: true,
                courierBonusApplied: true,
                courierId: true,
                courierFee: true,
                assignedAt: true,
                pickedUpAt: true,
                deliveredAt: true,
                createdAt: true,
                updatedAt: true,
                user: {
                    select: { id: true, phone: true, firstName: true, lastName: true },
                },
                items: {
                    select: {
                        id: true,
                        productId: true,
                        title: true,
                        price: true,
                        quantity: true,
                    },
                },
                restaurant: {
                    select: {
                        id: true,
                        slug: true,
                        nameRu: true,
                        nameKk: true,
                        coverImageUrl: true,
                        status: true,
                    },
                },
                courier: {
                    select: {
                        userId: true,
                        firstName: true,
                        lastName: true,
                        isOnline: true,
                        user: { select: { phone: true } },
                    },
                },
            },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        return order;
    }
    async updateOrderStatus(user, orderIdOrNumber, next) {
        const orderId = await this.resolveOrderUuid(orderIdOrNumber);
        const role = user.role ?? 'CLIENT';
        if (role === 'CLIENT')
            throw new common_1.ForbiddenException('Clients cannot change order status');
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            select: {
                id: true,
                status: true,
                restaurantId: true,
                courierId: true,
                createdAt: true,
                promisedAt: true,
            },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        if (role === 'RESTAURANT') {
            if (!user.restaurantId)
                throw new common_1.ForbiddenException('restaurantId missing');
            if (order.restaurantId !== user.restaurantId)
                throw new common_1.NotFoundException('Order not found');
        }
        if (role === 'COURIER') {
            if (!user.courierId)
                throw new common_1.ForbiddenException('courierId missing');
            if (order.courierId !== user.courierId)
                throw new common_1.ForbiddenException('Not your order');
        }
        const allowed = {
            [client_1.OrderStatus.CREATED]: [client_1.OrderStatus.ACCEPTED, client_1.OrderStatus.CANCELED],
            [client_1.OrderStatus.ACCEPTED]: [client_1.OrderStatus.COOKING, client_1.OrderStatus.CANCELED],
            [client_1.OrderStatus.COOKING]: [client_1.OrderStatus.READY, client_1.OrderStatus.CANCELED],
            [client_1.OrderStatus.READY]: [client_1.OrderStatus.ON_THE_WAY, client_1.OrderStatus.CANCELED],
            [client_1.OrderStatus.ON_THE_WAY]: [client_1.OrderStatus.DELIVERED, client_1.OrderStatus.CANCELED],
            [client_1.OrderStatus.DELIVERED]: [],
            [client_1.OrderStatus.CANCELED]: [],
            [client_1.OrderStatus.PAID]: [],
        };
        const current = order.status;
        const ok = (allowed[current] ?? []).includes(next);
        if (!ok && role !== 'ADMIN') {
            throw new common_1.BadRequestException(`Invalid status transition: ${current} -> ${next}`);
        }
        const data = { status: next };
        if (next === client_1.OrderStatus.ON_THE_WAY)
            data.pickedUpAt = new Date();
        if (next === client_1.OrderStatus.DELIVERED)
            data.deliveredAt = new Date();
        if (!order.promisedAt && next !== client_1.OrderStatus.CANCELED) {
            data.promisedAt = this.computePromisedAt(order.createdAt);
        }
        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.order.update({
                where: { id: orderId },
                data: data,
                select: {
                    id: true,
                    number: true,
                    status: true,
                    updatedAt: true,
                    pickedUpAt: true,
                    deliveredAt: true,
                },
            });
            if (next === client_1.OrderStatus.DELIVERED) {
                const o = await tx.order.findUnique({
                    where: { id: orderId },
                    select: { id: true, courierId: true, courierFee: true },
                });
                if (o?.courierId && (o.courierFee ?? 0) > 0) {
                    const exists = await tx.courierLedgerEntry.findFirst({
                        where: { orderId: o.id, type: client_1.LedgerType.ORDER_PAYOUT },
                        select: { id: true },
                    });
                    if (!exists) {
                        await tx.courierLedgerEntry.create({
                            data: {
                                courierUserId: o.courierId,
                                orderId: o.id,
                                type: client_1.LedgerType.ORDER_PAYOUT,
                                amount: o.courierFee,
                                comment: 'Payout for delivered order',
                            },
                            select: { id: true },
                        });
                    }
                }
            }
            return updated;
        });
    }
    assertAssignableStatus(status) {
        if (status === client_1.OrderStatus.DELIVERED || status === client_1.OrderStatus.CANCELED) {
            throw new common_1.BadRequestException('Cannot assign courier to finished order');
        }
    }
    async assignCourier(user, orderIdOrNumber, courierUserId) {
        this.ensureAdmin(user);
        const orderId = await this.resolveOrderUuid(orderIdOrNumber);
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            select: { id: true, status: true, courierId: true },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        this.assertAssignableStatus(order.status);
        const courierUser = await this.prisma.user.findUnique({
            where: { id: courierUserId },
            select: { id: true, role: true, isActive: true },
        });
        if (!courierUser || courierUser.role !== 'COURIER')
            throw new common_1.NotFoundException('Courier not found');
        if (!courierUser.isActive)
            throw new common_1.BadRequestException('Courier is blocked (inactive)');
        const courier = await this.prisma.courierProfile.findUnique({
            where: { userId: courierUserId },
            select: { userId: true },
        });
        if (!courier)
            throw new common_1.NotFoundException('Courier not found');
        const payout = await this.computeCourierPayoutApplied(courier.userId);
        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.order.update({
                where: { id: orderId },
                data: {
                    courierId: courier.userId,
                    courierFee: payout.courierFee,
                    courierBonusApplied: payout.bonusApplied,
                    pricingSource: payout.pricingSource,
                    assignedAt: new Date(),
                },
                select: {
                    id: true,
                    number: true,
                    courierId: true,
                    courierFee: true,
                    courierBonusApplied: true,
                    pricingSource: true,
                    assignedAt: true,
                },
            });
            await tx.courierProfile.update({
                where: { userId: courier.userId },
                data: { lastAssignedAt: new Date(), lastActiveAt: new Date() },
            });
            return updated;
        });
    }
    async unassignCourier(user, orderIdOrNumber) {
        this.ensureAdmin(user);
        const orderId = await this.resolveOrderUuid(orderIdOrNumber);
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            select: { id: true, status: true, courierId: true },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        this.assertAssignableStatus(order.status);
        if (!order.courierId) {
            return { ok: true, message: 'Courier is not assigned' };
        }
        return this.prisma.order.update({
            where: { id: orderId },
            data: {
                courierId: null,
                courierFee: 0,
                courierBonusApplied: 0,
                assignedAt: null,
            },
            select: {
                id: true,
                number: true,
                courierId: true,
                courierFee: true,
                courierBonusApplied: true,
                assignedAt: true,
            },
        });
    }
    async autoAssignCourier(user, orderIdOrNumber) {
        this.ensureAdmin(user);
        const orderId = await this.resolveOrderUuid(orderIdOrNumber);
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            select: { id: true, courierId: true, status: true },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        this.assertAssignableStatus(order.status);
        if (order.courierId) {
            return {
                ok: true,
                message: 'Already assigned',
                courierId: order.courierId,
            };
        }
        const courier = await this.pickBestCourier();
        if (!courier)
            throw new common_1.BadRequestException('No online couriers');
        return this.assignCourier(user, orderId, courier.userId);
    }
    async pickBestCourier() {
        const couriers = await this.prisma.courierProfile.findMany({
            where: {
                isOnline: true,
                user: { isActive: true },
            },
            select: {
                userId: true,
                lastAssignedAt: true,
                lastActiveAt: true,
                lastSeenAt: true,
            },
        });
        if (!couriers.length)
            return null;
        const courierIds = couriers.map((c) => c.userId);
        const grouped = await this.prisma.order.groupBy({
            by: ['courierId'],
            where: {
                courierId: { in: courierIds },
                status: { notIn: [client_1.OrderStatus.DELIVERED, client_1.OrderStatus.CANCELED] },
            },
            _count: { _all: true },
        });
        const activeCountMap = new Map();
        for (const g of grouped) {
            if (g.courierId)
                activeCountMap.set(g.courierId, g._count._all);
        }
        const sorted = [...couriers].sort((a, b) => {
            const la = activeCountMap.get(a.userId) ?? 0;
            const lb = activeCountMap.get(b.userId) ?? 0;
            if (la !== lb)
                return la - lb;
            const ta = a.lastAssignedAt ? a.lastAssignedAt.getTime() : 0;
            const tb = b.lastAssignedAt ? b.lastAssignedAt.getTime() : 0;
            if (ta !== tb)
                return ta - tb;
            const aa = a.lastActiveAt ? a.lastActiveAt.getTime() : 0;
            const ab = b.lastActiveAt ? b.lastActiveAt.getTime() : 0;
            if (aa !== ab)
                return ab - aa;
            const sa = a.lastSeenAt ? a.lastSeenAt.getTime() : 0;
            const sb = b.lastSeenAt ? b.lastSeenAt.getTime() : 0;
            return sb - sa;
        });
        return sorted[0] ? { userId: sorted[0].userId } : null;
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map