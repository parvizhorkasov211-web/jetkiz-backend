"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouriersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcryptjs"));
const client_1 = require("@prisma/client");
function safeDate(v) {
    try {
        if (!v)
            return null;
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    catch {
        return null;
    }
}
function diffSec(a, b) {
    const aa = a ? a.getTime() : NaN;
    const bb = b ? b.getTime() : NaN;
    if (!Number.isFinite(aa) || !Number.isFinite(bb))
        return null;
    const s = Math.floor((aa - bb) / 1000);
    return Number.isFinite(s) && s >= 0 ? s : null;
}
function buildOnlineStatsMap(courierIds, events, now, lastActiveAtMap) {
    const wanted = new Set(courierIds);
    const out = new Map();
    const lastOnline = new Map();
    const lastOffline = new Map();
    for (const ev of events || []) {
        const id = ev.courierUserId;
        if (!wanted.has(id))
            continue;
        if (ev.isOnline) {
            if (!lastOnline.has(id))
                lastOnline.set(id, ev.at);
        }
        else {
            if (!lastOffline.has(id))
                lastOffline.set(id, ev.at);
        }
    }
    for (const id of courierIds) {
        const lo = lastOnline.get(id) ?? null;
        const lf = lastOffline.get(id) ?? null;
        const lastSessionSec = lo && lf && lf.getTime() >= lo.getTime() ? diffSec(lf, lo) : null;
        let onlineForSec = null;
        if (lo)
            onlineForSec = diffSec(now, lo);
        if ((onlineForSec == null || onlineForSec < 0) && lastActiveAtMap) {
            const la = lastActiveAtMap.get(id) ?? null;
            if (la)
                onlineForSec = diffSec(now, la);
        }
        out.set(id, {
            lastOnlineAt: lo,
            lastOfflineAt: lf,
            onlineForSec,
            lastSessionSec,
        });
    }
    return out;
}
let CouriersService = class CouriersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    ensureAdmin(u) {
        if ((u.role ?? 'CLIENT') !== 'ADMIN') {
            throw new common_1.ForbiddenException('Only admin');
        }
    }
    async getActiveTariffPublic(user) {
        const t = await this.prisma.courierTariff.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                fee: true,
                isActive: true,
                startsAt: true,
                endsAt: true,
            },
        });
        return t ?? { id: null, fee: 0, isActive: false };
    }
    async setGlobalTariff(user, body) {
        this.ensureAdmin(user);
        const fee = Math.max(0, Math.round(Number(body?.fee) || 0));
        if (!fee)
            throw new common_1.BadRequestException('fee must be > 0');
        await this.prisma.$transaction([
            this.prisma.courierTariff.updateMany({
                where: { isActive: true },
                data: { isActive: false, endsAt: new Date() },
            }),
            this.prisma.courierTariff.create({
                data: {
                    fee,
                    isActive: true,
                    startsAt: new Date(),
                    endsAt: null,
                },
                select: { id: true },
            }),
        ]);
        return this.getActiveTariffPublic(user);
    }
    async getGlobalCommissionDefault(user) {
        this.ensureAdmin(user);
        const DEFAULT_PCT = 15;
        const cfg = await this.prisma.financeConfig.findFirst({
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                courierCommissionPctDefault: true,
                updatedAt: true,
            },
        });
        const pctRaw = cfg?.courierCommissionPctDefault;
        const pct = Math.max(0, Math.min(100, Math.round(Number(pctRaw ?? DEFAULT_PCT) || 0)));
        return { pct };
    }
    async setGlobalCommissionDefault(user, body) {
        this.ensureAdmin(user);
        const pct = Math.max(0, Math.min(100, Math.round(Number(body?.pct) || 0)));
        if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
            throw new common_1.BadRequestException('pct must be between 0 and 100');
        }
        const existing = await this.prisma.financeConfig.findFirst({
            orderBy: { updatedAt: 'desc' },
            select: { id: true },
        });
        if (existing?.id) {
            await this.prisma.financeConfig.update({
                where: { id: existing.id },
                data: { courierCommissionPctDefault: pct },
                select: { id: true },
            });
        }
        else {
            await this.prisma.financeConfig.create({
                data: { id: 'main', courierCommissionPctDefault: pct },
                select: { id: true },
            });
        }
        return { pct };
    }
    async setCourierPersonalFeeOverride(user, courierUserId, body) {
        this.ensureAdmin(user);
        const feeRaw = body?.fee;
        const fee = feeRaw == null ? null : Math.max(0, Math.round(Number(feeRaw) || 0));
        if (feeRaw != null && !Number.isFinite(Number(feeRaw))) {
            throw new common_1.BadRequestException('fee must be a number or null');
        }
        await this.getCourierOrThrow(courierUserId);
        const updated = await this.prisma.courierProfile.update({
            where: { userId: courierUserId },
            data: { personalFeeOverride: fee },
            select: {
                userId: true,
                personalFeeOverride: true,
                payoutBonusAdd: true,
                updatedAt: true,
            },
        });
        return updated;
    }
    async getCourierStatusSummary(user) {
        this.ensureAdmin(user);
        const total = await this.prisma.courierProfile.count();
        const online = await this.prisma.courierProfile.count({
            where: { isOnline: true },
        });
        const offline = total - online;
        const busyCourierIds = await this.prisma.order.findMany({
            where: {
                courierId: { not: null },
                status: {
                    in: [
                        client_1.OrderStatus.ACCEPTED,
                        client_1.OrderStatus.COOKING,
                        client_1.OrderStatus.READY,
                        client_1.OrderStatus.ON_THE_WAY,
                    ],
                },
            },
            select: { courierId: true },
            take: 5000,
        });
        const busy = new Set((busyCourierIds || []).map((x) => x.courierId).filter(Boolean)).size;
        return {
            total,
            online,
            offline,
            busy,
            generatedAt: new Date().toISOString(),
        };
    }
    async getCourierOnlineTimeline(user) {
        this.ensureAdmin(user);
        const now = new Date();
        const points = [];
        for (let i = 23; i >= 0; i--) {
            const from = new Date(now.getTime() - i * 60 * 60 * 1000);
            const to = new Date(from.getTime() + 60 * 60 * 1000);
            const onlineCount = await this.prisma.courierProfile.count({
                where: {
                    lastSeenAt: { gte: from, lt: to },
                },
            });
            points.push({
                hour: from.getHours(),
                ts: from.toISOString(),
                online: onlineCount,
            });
        }
        return points;
    }
    async getCourierOnlineSeries(user) {
        this.ensureAdmin(user);
        const now = new Date();
        const days = 14;
        const out = [];
        for (let i = days - 1; i >= 0; i--) {
            const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
            const seen = await this.prisma.courierProfile.count({
                where: { lastSeenAt: { gte: dayStart, lt: dayEnd } },
            });
            const active = await this.prisma.courierProfile.count({
                where: { lastActiveAt: { gte: dayStart, lt: dayEnd } },
            });
            out.push({
                bucket: dayStart.toISOString(),
                seenUnique: seen,
                activeUnique: active,
            });
        }
        return out;
    }
    async getCouriersAdmin(user, opts) {
        this.ensureAdmin(user);
        const page = Math.max(1, Math.trunc(Number(opts.page) || 1));
        const limit = Math.max(1, Math.min(200, Math.trunc(Number(opts.limit) || 20)));
        const skip = (page - 1) * limit;
        const take = limit;
        const whereUser = { role: 'COURIER' };
        if (opts.active === 'true')
            whereUser.isActive = true;
        if (opts.active === 'false')
            whereUser.isActive = false;
        const whereProfile = {};
        if (opts.online === 'true')
            whereProfile.isOnline = true;
        if (opts.online === 'false')
            whereProfile.isOnline = false;
        if (opts.q && opts.q.trim()) {
            const q = opts.q.trim();
            whereUser.OR = [
                { phone: { contains: q } },
                { firstName: { contains: q, mode: 'insensitive' } },
                { lastName: { contains: q, mode: 'insensitive' } },
            ];
            whereProfile.OR = [
                { firstName: { contains: q, mode: 'insensitive' } },
                { lastName: { contains: q, mode: 'insensitive' } },
                { iin: { contains: q } },
            ];
        }
        const [itemsRaw, total] = await this.prisma.$transaction([
            this.prisma.user.findMany({
                where: whereUser,
                orderBy: { createdAt: 'desc' },
                skip,
                take,
                select: {
                    id: true,
                    phone: true,
                    isActive: true,
                    avatarUrl: true,
                    courierProfile: {
                        where: whereProfile,
                        select: {
                            userId: true,
                            firstName: true,
                            lastName: true,
                            iin: true,
                            isOnline: true,
                            lastSeenAt: true,
                            lastActiveAt: true,
                            lastAssignedAt: true,
                            blockedAt: true,
                            blockReason: true,
                            personalFeeOverride: true,
                            payoutBonusAdd: true,
                            courierCommissionPctOverride: true,
                            addressText: true,
                            comment: true,
                            createdAt: true,
                            updatedAt: true,
                        },
                    },
                },
            }),
            this.prisma.user.count({ where: whereUser }),
        ]);
        const courierIds = (itemsRaw || [])
            .filter((u) => Boolean(u?.courierProfile))
            .map((u) => u.id);
        const lastActiveAtMap = new Map();
        for (const u of itemsRaw || []) {
            const p = u?.courierProfile;
            if (p?.userId)
                lastActiveAtMap.set(p.userId, safeDate(p.lastActiveAt));
        }
        const events = await this.prisma.courierOnlineEvent.findMany({
            where: { courierUserId: { in: courierIds } },
            orderBy: { at: 'desc' },
            select: { courierUserId: true, isOnline: true, at: true },
            take: Math.min(5000, Math.max(1000, courierIds.length * 20)),
        });
        const statsMap = buildOnlineStatsMap(courierIds, events, new Date(), lastActiveAtMap);
        const items = (itemsRaw || [])
            .filter((u) => Boolean(u?.courierProfile))
            .map((u) => {
            const p = u.courierProfile;
            const lastSeenAt = p?.lastSeenAt ? new Date(p.lastSeenAt) : null;
            const lastActiveAt = p?.lastActiveAt ? new Date(p.lastActiveAt) : null;
            const lastAssignedAt = p?.lastAssignedAt ? new Date(p.lastAssignedAt) : null;
            const st = statsMap.get(u.id);
            const lastOnlineAt = st?.lastOnlineAt ?? null;
            const lastOfflineAt = st?.lastOfflineAt ?? null;
            const onlineForSec = st?.onlineForSec ?? null;
            const lastSessionSec = st?.lastSessionSec ?? null;
            return {
                id: u.id,
                userId: u.id,
                phone: u.phone,
                avatarUrl: u.avatarUrl,
                isActive: u.isActive,
                firstName: p?.firstName ?? '',
                lastName: p?.lastName ?? '',
                iin: p?.iin ?? '',
                addressText: p?.addressText ?? null,
                comment: p?.comment ?? null,
                blockedAt: p?.blockedAt ?? null,
                blockReason: p?.blockReason ?? null,
                isOnline: p?.isOnline ?? false,
                personalFeeOverride: p?.personalFeeOverride ?? null,
                payoutBonusAdd: p?.payoutBonusAdd ?? null,
                courierCommissionPctOverride: p?.courierCommissionPctOverride ?? null,
                lastSeenAt: p?.lastSeenAt ?? null,
                lastActiveAt: p?.lastActiveAt ?? null,
                lastAssignedAt: p?.lastAssignedAt ?? null,
                lastOnlineAt: lastOnlineAt ? lastOnlineAt.toISOString() : null,
                lastOfflineAt: lastOfflineAt ? lastOfflineAt.toISOString() : null,
                onlineForSec: (p?.isOnline ?? false) ? onlineForSec : null,
                lastSessionSec: lastSessionSec,
                seenAgoSec: diffSec(new Date(), lastSeenAt),
                activeAgoSec: diffSec(new Date(), lastActiveAt),
                assignedAgoSec: diffSec(new Date(), lastAssignedAt),
            };
        });
        return { total, page, limit, items };
    }
    async createCourier(user, dto) {
        this.ensureAdmin(user);
        const phone = String(dto.phone || '').trim();
        const password = String(dto.password || '').trim();
        if (!phone)
            throw new common_1.BadRequestException('phone is required');
        if (password.length < 4)
            throw new common_1.BadRequestException('password too short');
        const firstName = String(dto.firstName || '').trim();
        const lastName = String(dto.lastName || '').trim();
        const iin = String(dto.iin || '').trim();
        if (!firstName)
            throw new common_1.BadRequestException('firstName is required');
        if (!lastName)
            throw new common_1.BadRequestException('lastName is required');
        if (!iin)
            throw new common_1.BadRequestException('iin is required');
        const exists = await this.prisma.user.findUnique({
            where: { phone },
            select: { id: true },
        });
        if (exists)
            throw new common_1.BadRequestException('phone already exists');
        const hash = await bcrypt.hash(password, 10);
        const created = await this.prisma.user.create({
            data: {
                role: 'COURIER',
                phone,
                passwordHash: hash,
                isActive: true,
                firstName,
                lastName,
                courierProfile: {
                    create: {
                        firstName,
                        lastName,
                        iin,
                        isOnline: false,
                        lastSeenAt: new Date(),
                        lastActiveAt: null,
                        lastAssignedAt: null,
                        blockedAt: null,
                        blockReason: null,
                        personalFeeOverride: null,
                        payoutBonusAdd: null,
                        addressText: null,
                        comment: null,
                        courierCommissionPctOverride: null,
                    },
                },
            },
            select: { id: true },
        });
        return { id: created.id };
    }
    async getCourierAdminById(user, courierUserId) {
        this.ensureAdmin(user);
        const u = await this.prisma.user.findUnique({
            where: { id: courierUserId },
            select: {
                id: true,
                phone: true,
                isActive: true,
                avatarUrl: true,
                courierProfile: {
                    select: {
                        userId: true,
                        firstName: true,
                        lastName: true,
                        iin: true,
                        addressText: true,
                        comment: true,
                        blockedAt: true,
                        blockReason: true,
                        isOnline: true,
                        personalFeeOverride: true,
                        payoutBonusAdd: true,
                        courierCommissionPctOverride: true,
                        lastSeenAt: true,
                        lastActiveAt: true,
                        lastAssignedAt: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
            },
        });
        if (!u || !u.courierProfile)
            throw new common_1.NotFoundException('Courier not found');
        const activeOrder = await this.prisma.order.findFirst({
            where: {
                courierId: courierUserId,
                status: {
                    in: [
                        client_1.OrderStatus.ACCEPTED,
                        client_1.OrderStatus.COOKING,
                        client_1.OrderStatus.READY,
                        client_1.OrderStatus.ON_THE_WAY,
                    ],
                },
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                status: true,
                total: true,
                createdAt: true,
                assignedAt: true,
                phone: true,
                addressId: true,
                restaurant: { select: { id: true, nameRu: true } },
            },
        });
        const activeTariff = await this.getActiveTariffPublic(user);
        return {
            id: u.id,
            userId: u.id,
            phone: u.phone,
            isActive: u.isActive,
            avatarUrl: u.avatarUrl,
            firstName: u.courierProfile.firstName ?? '',
            lastName: u.courierProfile.lastName ?? '',
            iin: u.courierProfile.iin ?? '',
            addressText: u.courierProfile.addressText ?? null,
            comment: u.courierProfile.comment ?? null,
            blockedAt: u.courierProfile.blockedAt ?? null,
            blockReason: u.courierProfile.blockReason ?? null,
            isOnline: u.courierProfile.isOnline ?? false,
            personalFeeOverride: u.courierProfile.personalFeeOverride ?? null,
            payoutBonusAdd: u.courierProfile.payoutBonusAdd ?? null,
            courierCommissionPctOverride: u.courierProfile.courierCommissionPctOverride ?? null,
            lastSeenAt: u.courierProfile.lastSeenAt ?? null,
            lastActiveAt: u.courierProfile.lastActiveAt ?? null,
            lastAssignedAt: u.courierProfile.lastAssignedAt ?? null,
            activeOrders: activeOrder ? [activeOrder] : [],
            activeTariff,
        };
    }
    async uploadMyAvatar(user, file) {
        if ((user.role ?? 'CLIENT') !== 'COURIER')
            throw new common_1.ForbiddenException('Only courier');
        if (!file)
            throw new common_1.BadRequestException('file is required');
        const url = `/${file.path.replace(/\\/g, '/')}`;
        await this.prisma.user.update({
            where: { id: user.id },
            data: { avatarUrl: url },
            select: { id: true },
        });
        return { ok: true, avatarUrl: url };
    }
    async uploadCourierAvatar(user, courierUserId, file) {
        this.ensureAdmin(user);
        if (!file)
            throw new common_1.BadRequestException('file is required');
        await this.getCourierOrThrow(courierUserId);
        const url = `/${file.path.replace(/\\/g, '/')}`;
        await this.prisma.user.update({
            where: { id: courierUserId },
            data: { avatarUrl: url },
            select: { id: true },
        });
        return { ok: true, avatarUrl: url };
    }
    async updateCourierProfile(user, courierUserId, dto) {
        this.ensureAdmin(user);
        await this.getCourierOrThrow(courierUserId);
        const data = {};
        if (dto.firstName != null)
            data.firstName = String(dto.firstName).trim();
        if (dto.lastName != null)
            data.lastName = String(dto.lastName).trim();
        if (dto.iin != null)
            data.iin = String(dto.iin).trim();
        if (dto.addressText !== undefined)
            data.addressText = dto.addressText ? String(dto.addressText).trim() : null;
        if (dto.comment !== undefined)
            data.comment = dto.comment ? String(dto.comment).trim() : null;
        if (dto.personalFeeOverride !== undefined) {
            data.personalFeeOverride =
                dto.personalFeeOverride === null
                    ? null
                    : Math.max(0, Math.trunc(Number(dto.personalFeeOverride) || 0));
        }
        if (dto.payoutBonusAdd !== undefined) {
            data.payoutBonusAdd =
                dto.payoutBonusAdd === null
                    ? null
                    : Math.max(0, Math.trunc(Number(dto.payoutBonusAdd) || 0));
        }
        if (dto.courierCommissionPctOverride !== undefined) {
            const v = dto.courierCommissionPctOverride;
            data.courierCommissionPctOverride =
                v == null ? null : Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
        }
        const updated = await this.prisma.courierProfile.update({
            where: { userId: courierUserId },
            data,
            select: { userId: true },
        });
        return updated;
    }
    async blockCourier(user, courierUserId, dto) {
        this.ensureAdmin(user);
        const blocked = Boolean(dto?.blocked);
        const reason = dto?.reason != null ? String(dto.reason).trim() : null;
        await this.getCourierOrThrow(courierUserId);
        await this.prisma.user.update({
            where: { id: courierUserId },
            data: { isActive: !blocked },
            select: { id: true },
        });
        const updated = await this.prisma.courierProfile.update({
            where: { userId: courierUserId },
            data: {
                blockedAt: blocked ? new Date() : null,
                blockReason: blocked ? reason : null,
            },
            select: { userId: true, blockedAt: true, blockReason: true },
        });
        return updated;
    }
    async setCourierOnline(user, courierUserId, body) {
        const role = user.role ?? 'CLIENT';
        if (role === 'ADMIN') {
        }
        else if (role === 'COURIER') {
            if (user.id !== courierUserId)
                throw new common_1.ForbiddenException('Not your id');
        }
        else {
            throw new common_1.ForbiddenException('Forbidden');
        }
        const isOnline = Boolean(body?.isOnline);
        await this.getCourierOrThrow(courierUserId);
        const updated = await this.prisma.courierProfile.update({
            where: { userId: courierUserId },
            data: {
                isOnline,
                lastSeenAt: new Date(),
                lastActiveAt: isOnline ? new Date() : undefined,
            },
            select: {
                userId: true,
                isOnline: true,
                lastSeenAt: true,
                lastActiveAt: true,
            },
        });
        await this.prisma.courierOnlineEvent.create({
            data: {
                courierUserId,
                isOnline,
                source: String(body?.source || (role === 'ADMIN' ? 'admin' : 'courier')),
            },
            select: { id: true },
        });
        return updated;
    }
    async assignOrderToCourier(user, courierUserId, body) {
        this.ensureAdmin(user);
        const orderId = String(body?.orderId || '').trim();
        if (!orderId)
            throw new common_1.BadRequestException('orderId is required');
        await this.getCourierOrThrow(courierUserId);
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            select: { id: true, status: true },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        await this.prisma.order.update({
            where: { id: orderId },
            data: {
                courierId: courierUserId,
                assignedAt: new Date(),
            },
            select: { id: true },
        });
        await this.prisma.courierProfile.update({
            where: { userId: courierUserId },
            data: {
                lastAssignedAt: new Date(),
            },
            select: { userId: true },
        });
        return { ok: true };
    }
    async unassignOrderFromCourier(user, courierUserId, body) {
        this.ensureAdmin(user);
        const orderId = String(body?.orderId || '').trim();
        if (!orderId)
            throw new common_1.BadRequestException('orderId is required');
        await this.getCourierOrThrow(courierUserId);
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            select: { id: true, courierId: true },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        await this.prisma.order.update({
            where: { id: orderId },
            data: {
                courierId: null,
            },
            select: { id: true },
        });
        return { ok: true };
    }
    async getCourierOrThrow(courierUserId) {
        const c = await this.prisma.courierProfile.findUnique({
            where: { userId: courierUserId },
            select: { userId: true },
        });
        if (!c)
            throw new common_1.NotFoundException('Courier not found');
        return c;
    }
    async getCourierFinanceSummary(user, courierUserId, opts) {
        this.ensureAdmin(user);
        await this.getCourierOrThrow(courierUserId);
        const from = opts?.from ? safeDate(opts.from) : null;
        const to = opts?.to ? safeDate(opts.to) : null;
        const where = { courierUserId };
        if (from)
            where.createdAt = { ...(where.createdAt || {}), gte: from };
        if (to)
            where.createdAt = { ...(where.createdAt || {}), lte: to };
        const rows = await this.prisma.courierLedgerEntry.findMany({
            where,
            select: { id: true, type: true, amount: true },
            take: 5000,
        });
        const incomeTypes = [
            client_1.LedgerType.ORDER_PAYOUT,
            client_1.LedgerType.BONUS,
            client_1.LedgerType.MANUAL_ADJUSTMENT,
        ];
        let totalIncome = 0;
        let totalPayout = 0;
        for (const r of rows || []) {
            if (incomeTypes.includes(r.type))
                totalIncome += Number(r.amount || 0);
            if (r.type === client_1.LedgerType.PAYOUT)
                totalPayout += Number(r.amount || 0);
        }
        return {
            totalIncome,
            totalPayout,
            balance: totalIncome - totalPayout,
        };
    }
    async getCourierFinanceLedger(user, courierUserId, opts) {
        this.ensureAdmin(user);
        await this.getCourierOrThrow(courierUserId);
        const page = Math.max(1, Math.trunc(Number(opts?.page) || 1));
        const limit = Math.max(1, Math.min(200, Math.trunc(Number(opts?.limit) || 50)));
        const skip = (page - 1) * limit;
        const from = opts?.from ? safeDate(opts.from) : null;
        const to = opts?.to ? safeDate(opts.to) : null;
        const where = { courierUserId };
        if (from)
            where.createdAt = { ...(where.createdAt || {}), gte: from };
        if (to)
            where.createdAt = { ...(where.createdAt || {}), lte: to };
        const [items, total] = await this.prisma.$transaction([
            this.prisma.courierLedgerEntry.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.courierLedgerEntry.count({ where }),
        ]);
        return { items, total, page, limit };
    }
    async createCourierPayout(user, courierUserId, body) {
        this.ensureAdmin(user);
        await this.getCourierOrThrow(courierUserId);
        const amount = Number(body?.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new common_1.BadRequestException('amount must be > 0');
        }
        const comment = body?.comment != null ? String(body.comment).trim() : null;
        await this.prisma.courierLedgerEntry.create({
            data: {
                courierUserId,
                type: client_1.LedgerType.PAYOUT,
                amount: Math.round(amount),
                comment,
            },
            select: { id: true },
        });
        return { ok: true };
    }
    async setCourierCommissionOverride(user, courierUserId, body) {
        this.ensureAdmin(user);
        await this.getCourierOrThrow(courierUserId);
        const v = body?.commissionPctOverride ?? body?.courierCommissionPctOverride;
        const pct = v == null ? null : Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
        const updated = await this.prisma.courierProfile.update({
            where: { userId: courierUserId },
            data: { courierCommissionPctOverride: pct },
            select: { userId: true, courierCommissionPctOverride: true },
        });
        return updated;
    }
};
exports.CouriersService = CouriersService;
exports.CouriersService = CouriersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CouriersService);
//# sourceMappingURL=couriers.service.js.map