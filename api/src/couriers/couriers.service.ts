import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrackingGateway } from '../tracking/tracking.gateway';
import * as bcrypt from 'bcryptjs';
import { LedgerType, OrderStatus } from '@prisma/client';
import { UpdateCourierProfileDto } from './dto/update-courier-profile.dto';
import { BlockCourierDto } from './dto/block-courier.dto';

type JwtUser = { id: string; role?: string };

function safeDate(v: any): Date | null {
  try {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function diffSec(a?: Date | null, b?: Date | null): number | null {
  const aa = a ? a.getTime() : NaN;
  const bb = b ? b.getTime() : NaN;
  if (!Number.isFinite(aa) || !Number.isFinite(bb)) return null;
  const s = Math.floor((aa - bb) / 1000);
  return Number.isFinite(s) && s >= 0 ? s : null;
}

type OnlineStats = {
  lastOnlineAt: Date | null;
  lastOfflineAt: Date | null;
  onlineForSec: number | null;
  lastSessionSec: number | null;
};

/**
 * Build online session stats from CourierOnlineEvent list (ordered by at desc).
 * We only need the most recent online/offline transition for each courier.
 */
function buildOnlineStatsMap(
  courierIds: string[],
  events: Array<{ courierUserId: string; isOnline: boolean; at: Date }>,
  now: Date,
  lastActiveAtMap?: Map<string, Date | null>,
): Map<string, OnlineStats> {
  const wanted = new Set(courierIds);
  const out = new Map<string, OnlineStats>();

  const lastOnline = new Map<string, Date>();
  const lastOffline = new Map<string, Date>();

  for (const ev of events || []) {
    const id = ev.courierUserId;
    if (!wanted.has(id)) continue;

    if (ev.isOnline) {
      if (!lastOnline.has(id)) lastOnline.set(id, ev.at);
    } else {
      if (!lastOffline.has(id)) lastOffline.set(id, ev.at);
    }
  }

  for (const id of courierIds) {
    const lo = lastOnline.get(id) ?? null;
    const lf = lastOffline.get(id) ?? null;

    const lastSessionSec =
      lo && lf && lf.getTime() >= lo.getTime() ? diffSec(lf, lo) : null;

    let onlineForSec: number | null = null;
    if (lo) onlineForSec = diffSec(now, lo);

    if ((onlineForSec == null || onlineForSec < 0) && lastActiveAtMap) {
      const la = lastActiveAtMap.get(id) ?? null;
      if (la) onlineForSec = diffSec(now, la);
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

@Injectable()
export class CouriersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trackingGateway: TrackingGateway,
  ) {}

  private ensureAdmin(u: JwtUser) {
    if ((u.role ?? 'CLIENT') !== 'ADMIN') {
      throw new ForbiddenException('Only admin');
    }
  }

  // =========================
  // ✅ GLOBAL DEFAULT TARIFF
  // ЕДИНЫЙ ИСТОЧНИК ПРАВДЫ:
  // financeConfig.courierPayoutDefault
  //
  // По новой бизнес-логике это:
  // - стоимость доставки для клиента
  // - gross база для курьера
  // =========================
  async getActiveTariffPublic(user: JwtUser) {
    this.ensureAdmin(user);

    const cfg = await this.prisma.financeConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        courierPayoutDefault: true,
        updatedAt: true,
      },
    });

    const fee = Math.max(
      0,
      Math.round(Number(cfg?.courierPayoutDefault ?? 0) || 0),
    );

    return {
      id: cfg?.id ?? 'main',
      fee,
      isActive: true,
      startsAt: cfg?.updatedAt ?? null,
      endsAt: null,
      meaning: 'GLOBAL_DELIVERY_TARIFF',
    };
  }

  async setGlobalTariff(user: JwtUser, body: { fee: number }) {
    this.ensureAdmin(user);

    const fee = Math.max(0, Math.round(Number(body?.fee) || 0));
    if (!fee) throw new BadRequestException('fee must be > 0');

    const existing = await this.prisma.financeConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });

    if (existing?.id) {
      await this.prisma.financeConfig.update({
        where: { id: existing.id },
        data: {
          // единый тариф доставки
          courierPayoutDefault: fee,
        },
        select: { id: true },
      });
    } else {
      await this.prisma.financeConfig.create({
        data: {
          id: 'main',
          courierPayoutDefault: fee,
        },
        select: { id: true },
      });
    }

    return this.getActiveTariffPublic(user);
  }

  // =========================
  // ✅ GLOBAL COMMISSION DEFAULT (admin)
  // Source of truth: financeConfig.courierCommissionPctDefault
  // =========================
  async getGlobalCommissionDefault(user: JwtUser) {
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
    const pct = Math.max(
      0,
      Math.min(100, Math.round(Number(pctRaw ?? DEFAULT_PCT) || 0)),
    );

    return { pct };
  }

  async setGlobalCommissionDefault(user: JwtUser, body: { pct: number }) {
    this.ensureAdmin(user);

    const pct = Math.max(0, Math.min(100, Math.round(Number(body?.pct) || 0)));
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      throw new BadRequestException('pct must be between 0 and 100');
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
    } else {
      await this.prisma.financeConfig.create({
        data: { id: 'main', courierCommissionPctDefault: pct },
        select: { id: true },
      });
    }

    return { pct };
  }

  // =========================
  // ✅ PERSONAL FEE (admin)
  //
  // Сохраняем поле для совместимости данных/UI,
  // но в новой модели оно не должно влиять на courier gross.
  // =========================
  async setCourierPersonalFeeOverride(
    user: JwtUser,
    courierUserId: string,
    body: { fee: number | null },
  ) {
    this.ensureAdmin(user);

    const feeRaw = body?.fee;
    const fee =
      feeRaw == null ? null : Math.max(0, Math.round(Number(feeRaw) || 0));

    if (feeRaw != null && !Number.isFinite(Number(feeRaw))) {
      throw new BadRequestException('fee must be a number or null');
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

  // =========================
  // ✅ METRICS (admin)
  // =========================
  async getCourierStatusSummary(user: JwtUser) {
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
            OrderStatus.ACCEPTED,
            OrderStatus.COOKING,
            OrderStatus.READY,
            OrderStatus.ON_THE_WAY,
          ],
        },
      },
      select: { courierId: true },
      take: 5000,
    });

    const busy = new Set(
      (busyCourierIds || []).map((x: any) => x.courierId).filter(Boolean),
    ).size;

    return {
      total,
      online,
      offline,
      busy,
      generatedAt: new Date().toISOString(),
    };
  }

  async getCourierOnlineTimeline(user: JwtUser) {
    this.ensureAdmin(user);

    const now = new Date();
    const points: Array<{ hour: number; ts: string; online: number }> = [];

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

  async getCourierOnlineSeries(user: JwtUser) {
    this.ensureAdmin(user);

    const now = new Date();
    const days = 14;
    const out: Array<{
      bucket: string;
      seenUnique: number;
      activeUnique: number;
    }> = [];

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

  // =========================
  // ✅ ADMIN LIST
  // =========================
  async getCouriersAdmin(
    user: JwtUser,
    opts: {
      page: number;
      limit: number;
      q?: string;
      online?: string;
      active?: string;
    },
  ) {
    this.ensureAdmin(user);

    const page = Math.max(1, Math.trunc(Number(opts.page) || 1));
    const limit = Math.max(
      1,
      Math.min(200, Math.trunc(Number(opts.limit) || 20)),
    );
    const skip = (page - 1) * limit;
    const take = limit;

    const whereUser: any = { role: 'COURIER' };

    if (opts.active === 'true') whereUser.isActive = true;
    if (opts.active === 'false') whereUser.isActive = false;

    const whereProfile: any = {};

    if (opts.online === 'true') whereProfile.isOnline = true;
    if (opts.online === 'false') whereProfile.isOnline = false;

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
      .filter((u: any) => Boolean(u?.courierProfile))
      .map((u: any) => u.id);

    const lastActiveAtMap = new Map<string, Date | null>();
    for (const u of itemsRaw || []) {
      const p = u?.courierProfile;
      if (p?.userId) lastActiveAtMap.set(p.userId, safeDate(p.lastActiveAt));
    }

    const events = await this.prisma.courierOnlineEvent.findMany({
      where: { courierUserId: { in: courierIds } },
      orderBy: { at: 'desc' },
      select: { courierUserId: true, isOnline: true, at: true },
      take: Math.min(5000, Math.max(1000, courierIds.length * 20)),
    });

    const statsMap = buildOnlineStatsMap(
      courierIds,
      events as any,
      new Date(),
      lastActiveAtMap,
    );

    const items = (itemsRaw || [])
      .filter((u: any) => Boolean(u?.courierProfile))
      .map((u: any) => {
        const p = u.courierProfile;

        const lastSeenAt = p?.lastSeenAt ? new Date(p.lastSeenAt) : null;
        const lastActiveAt = p?.lastActiveAt ? new Date(p.lastActiveAt) : null;
        const lastAssignedAt = p?.lastAssignedAt
          ? new Date(p.lastAssignedAt)
          : null;

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

          courierCommissionPctOverride:
            p?.courierCommissionPctOverride ?? null,

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

  // =========================
  // ✅ CREATE COURIER (admin)
  // =========================
  async createCourier(user: JwtUser, dto: any) {
    this.ensureAdmin(user);

    const phone = String(dto.phone || '').trim();
    const password = String(dto.password || '').trim();

    if (!phone) throw new BadRequestException('phone is required');
    if (password.length < 4) throw new BadRequestException('password too short');

    const firstName = String(dto.firstName || '').trim();
    const lastName = String(dto.lastName || '').trim();
    const iin = String(dto.iin || '').trim();

    if (!firstName) throw new BadRequestException('firstName is required');
    if (!lastName) throw new BadRequestException('lastName is required');
    if (!iin) throw new BadRequestException('iin is required');

    const exists = await this.prisma.user.findUnique({
      where: { phone },
      select: { id: true },
    });
    if (exists) throw new BadRequestException('phone already exists');

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
            payoutBonusAdd: 0,
            addressText: null,
            comment: null,
            courierCommissionPctOverride: null,
          },
        },
      } as any,
      select: { id: true },
    });

    return { id: created.id };
  }

  // =========================
  // ✅ ADMIN GET BY ID
  // =========================
  async getCourierAdminById(user: JwtUser, courierUserId: string) {
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
      throw new NotFoundException('Courier not found');

    const activeOrder = await this.prisma.order.findFirst({
      where: {
        courierId: courierUserId,
        status: {
          in: [
            OrderStatus.ACCEPTED,
            OrderStatus.COOKING,
            OrderStatus.READY,
            OrderStatus.ON_THE_WAY,
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
      courierCommissionPctOverride:
        u.courierProfile.courierCommissionPctOverride ?? null,

      lastSeenAt: u.courierProfile.lastSeenAt ?? null,
      lastActiveAt: u.courierProfile.lastActiveAt ?? null,
      lastAssignedAt: u.courierProfile.lastAssignedAt ?? null,

      activeOrders: activeOrder ? [activeOrder] : [],
      activeTariff,
    };
  }

  // =========================
  // ✅ UPLOAD AVATAR (me/admin)
  // =========================
  async uploadMyAvatar(user: JwtUser, file?: Express.Multer.File) {
    if ((user.role ?? 'CLIENT') !== 'COURIER') {
      throw new ForbiddenException('Only courier');
    }
    if (!file) throw new BadRequestException('file is required');

    const url = `/${file.path.replace(/\\/g, '/')}`;

    await this.prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: url },
      select: { id: true },
    });

    return { ok: true, avatarUrl: url };
  }

  async uploadCourierAvatar(
    user: JwtUser,
    courierUserId: string,
    file?: Express.Multer.File,
  ) {
    this.ensureAdmin(user);
    if (!file) throw new BadRequestException('file is required');

    await this.getCourierOrThrow(courierUserId);

    const url = `/${file.path.replace(/\\/g, '/')}`;

    await this.prisma.user.update({
      where: { id: courierUserId },
      data: { avatarUrl: url },
      select: { id: true },
    });

    return { ok: true, avatarUrl: url };
  }

  // =========================
  // ✅ UPDATE PROFILE (admin)
  // =========================
  async updateCourierProfile(
    user: JwtUser,
    courierUserId: string,
    dto: UpdateCourierProfileDto,
  ) {
    this.ensureAdmin(user);

    await this.getCourierOrThrow(courierUserId);

    const data: any = {};

    if (dto.firstName != null) data.firstName = String(dto.firstName).trim();
    if (dto.lastName != null) data.lastName = String(dto.lastName).trim();
    if (dto.iin != null) data.iin = String(dto.iin).trim();
    if (dto.addressText !== undefined) {
      data.addressText = dto.addressText
        ? String(dto.addressText).trim()
        : null;
    }
    if (dto.comment !== undefined) {
      data.comment = dto.comment ? String(dto.comment).trim() : null;
    }

    if ((dto as any).personalFeeOverride !== undefined) {
      data.personalFeeOverride =
        (dto as any).personalFeeOverride === null
          ? null
          : Math.max(
              0,
              Math.trunc(Number((dto as any).personalFeeOverride) || 0),
            );
    }

    if ((dto as any).payoutBonusAdd !== undefined) {
      data.payoutBonusAdd =
        (dto as any).payoutBonusAdd === null
          ? null
          : Math.max(0, Math.trunc(Number((dto as any).payoutBonusAdd) || 0));
    }

    if ((dto as any).courierCommissionPctOverride !== undefined) {
      const v = (dto as any).courierCommissionPctOverride;
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

  // =========================
  // ✅ BLOCK/UNBLOCK (admin)
  // =========================
  async blockCourier(user: JwtUser, courierUserId: string, dto: BlockCourierDto) {
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

  // =========================
  // ✅ ONLINE/OFFLINE
  // =========================
  async setCourierOnline(user: JwtUser, courierUserId: string, body: any) {
    const role = user.role ?? 'CLIENT';

    if (role === 'ADMIN') {
      // ok
    } else if (role === 'COURIER') {
      if (user.id !== courierUserId) throw new ForbiddenException('Not your id');
    } else {
      throw new ForbiddenException('Forbidden');
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

  // =========================
  // ✅ ASSIGN/UNASSIGN ORDER (legacy admin)
  //
  // ВНИМАНИЕ:
  // Этот метод только ставит courierId.
  // Финансовый snapshot здесь не считается.
  // Для правильного order flow используй /orders/:id/assign-courier.
  // =========================
  async assignOrderToCourier(user: JwtUser, courierUserId: string, body: any) {
    this.ensureAdmin(user);

    const orderId = String(body?.orderId || '').trim();
    if (!orderId) throw new BadRequestException('orderId is required');

    await this.getCourierOrThrow(courierUserId);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
    });
    if (!order) throw new NotFoundException('Order not found');

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

  async unassignOrderFromCourier(user: JwtUser, courierUserId: string, body: any) {
    this.ensureAdmin(user);

    const orderId = String(body?.orderId || '').trim();
    if (!orderId) throw new BadRequestException('orderId is required');

    await this.getCourierOrThrow(courierUserId);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, courierId: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        courierId: null,
      },
      select: { id: true },
    });

    return { ok: true };
  }

  // =========================
  // ✅ HELPERS
  // =========================
  async getCourierOrThrow(courierUserId: string) {
    const c = await this.prisma.courierProfile.findUnique({
      where: { userId: courierUserId },
      select: { userId: true },
    });
    if (!c) throw new NotFoundException('Courier not found');
    return c;
  }

  // =========================
  // ✅ FINANCE (admin)
  // =========================
  async getCourierFinanceSummary(user: JwtUser, courierUserId: string, opts: any) {
    this.ensureAdmin(user);

    await this.getCourierOrThrow(courierUserId);

    const from = opts?.from ? safeDate(opts.from) : null;
    const to = opts?.to ? safeDate(opts.to) : null;

    const where: any = { courierUserId };
    if (from) where.createdAt = { ...(where.createdAt || {}), gte: from };
    if (to) where.createdAt = { ...(where.createdAt || {}), lte: to };

    const rows = await this.prisma.courierLedgerEntry.findMany({
      where,
      select: { id: true, type: true, amount: true },
      take: 5000,
    });

    const incomeTypes: LedgerType[] = [
      LedgerType.ORDER_PAYOUT,
      LedgerType.BONUS,
      LedgerType.MANUAL_ADJUSTMENT,
    ];

    let totalIncome = 0;
    let totalPayout = 0;

    for (const r of rows || []) {
      if (incomeTypes.includes(r.type)) totalIncome += Number(r.amount || 0);
      if (r.type === LedgerType.PAYOUT) totalPayout += Number(r.amount || 0);
    }

    return {
      totalIncome,
      totalPayout,
      balance: totalIncome - totalPayout,
    };
  }

  async getCourierFinanceLedger(user: JwtUser, courierUserId: string, opts: any) {
    this.ensureAdmin(user);

    await this.getCourierOrThrow(courierUserId);

    const page = Math.max(1, Math.trunc(Number(opts?.page) || 1));
    const limit = Math.max(
      1,
      Math.min(200, Math.trunc(Number(opts?.limit) || 50)),
    );
    const skip = (page - 1) * limit;

    const from = opts?.from ? safeDate(opts.from) : null;
    const to = opts?.to ? safeDate(opts.to) : null;

    const where: any = { courierUserId };
    if (from) where.createdAt = { ...(where.createdAt || {}), gte: from };
    if (to) where.createdAt = { ...(where.createdAt || {}), lte: to };

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

  async createCourierPayout(user: JwtUser, courierUserId: string, body: any) {
    this.ensureAdmin(user);

    await this.getCourierOrThrow(courierUserId);

    const amount = Number(body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('amount must be > 0');
    }

    const comment = body?.comment != null ? String(body.comment).trim() : null;

    await this.prisma.courierLedgerEntry.create({
      data: {
        courierUserId,
        type: LedgerType.PAYOUT,
        amount: Math.round(amount),
        comment,
      },
      select: { id: true },
    });

    return { ok: true };
  }

  async setCourierCommissionOverride(user: JwtUser, courierUserId: string, body: any) {
    this.ensureAdmin(user);

    await this.getCourierOrThrow(courierUserId);

    const v = body?.commissionPctOverride ?? body?.courierCommissionPctOverride;
    const pct =
      v == null ? null : Math.max(0, Math.min(100, Math.round(Number(v) || 0)));

    const updated = await this.prisma.courierProfile.update({
      where: { userId: courierUserId },
      data: { courierCommissionPctOverride: pct },
      select: { userId: true, courierCommissionPctOverride: true },
    });

    return updated;
  }

  async updateCourierLocation(
    user: JwtUser,
    body: { lat: number; lng: number },
  ) {
    if ((user.role ?? 'CLIENT') !== 'COURIER') {
      throw new ForbiddenException('Only courier');
    }

    console.log('updateCourierLocation called:', {
      userId: user.id,
      role: user.role,
      lat: body?.lat,
      lng: body?.lng,
    });

    const lat = Number(body?.lat);
    const lng = Number(body?.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestException('Invalid coordinates');
    }

    await this.getCourierOrThrow(user.id);

    const updated = await this.prisma.courierProfile.update({
      where: { userId: user.id },
      data: {
        lat,
        lng,
        lastSeenAt: new Date(),
        lastActiveAt: new Date(),
      },
      select: {
        userId: true,
        lat: true,
        lng: true,
        isOnline: true,
        lastSeenAt: true,
      },
    });

    console.log('emitCourierLocation sending:', {
      courierId: updated.userId,
      lat: Number(updated.lat),
      lng: Number(updated.lng),
      isOnline: updated.isOnline ?? false,
      lastSeenAt: updated.lastSeenAt,
    });

    this.trackingGateway.emitCourierLocation({
      courierId: updated.userId,
      userId: updated.userId,
      lat: Number(updated.lat),
      lng: Number(updated.lng),
      isOnline: updated.isOnline ?? false,
      lastSeenAt: updated.lastSeenAt,
      activeOrderId: null,
    });

    return updated;
  }

  async getMapCouriers(user: JwtUser) {
    if ((user.role ?? 'CLIENT') !== 'ADMIN') {
      throw new ForbiddenException('Only admin');
    }

    console.log('GET MAP COURIERS CALLED');

    const rows = await this.prisma.courierProfile.findMany({
      where: {
        isOnline: true,
        lat: { not: null },
        lng: { not: null },
      },
      select: {
        userId: true,
        lat: true,
        lng: true,
        lastSeenAt: true,
        isOnline: true,
      },
    });

    console.log('MAP ROWS:', rows);

    return rows;
  }
}