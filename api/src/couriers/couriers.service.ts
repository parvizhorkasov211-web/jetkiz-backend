// api/src/couriers/couriers.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

type JwtUser = { id: string; role?: string };

@Injectable()
export class CouriersService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureAdmin(u: JwtUser) {
    if ((u.role ?? 'CLIENT') !== 'ADMIN') throw new ForbiddenException('Only admin');
  }

  async list(
    user: JwtUser,
    opts: { q?: string; page: number; limit: number; online?: boolean },
  ) {
    this.ensureAdmin(user);

    const p = Math.max(1, Number(opts.page || 1));
    const l = Math.min(200, Math.max(1, Number(opts.limit || 20)));
    const skip = (p - 1) * l;

    const whereUser: any = { role: 'COURIER' };

    if (opts.q && opts.q.trim()) {
      const q = opts.q.trim();
      whereUser.OR = [
        { phone: { contains: q, mode: 'insensitive' } },
        { courierProfile: { firstName: { contains: q, mode: 'insensitive' } } },
        { courierProfile: { lastName: { contains: q, mode: 'insensitive' } } },
        { courierProfile: { iin: { contains: q, mode: 'insensitive' } } },
      ];
    }

    if (opts.online != null) {
      whereUser.courierProfile = {
        ...(whereUser.courierProfile ?? {}),
        isOnline: opts.online,
      };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where: whereUser,
        orderBy: { createdAt: 'desc' },
        skip,
        take: l,
        select: {
          id: true,
          phone: true,
          isActive: true,
          createdAt: true,
          courierProfile: {
            select: {
              firstName: true,
              lastName: true,
              iin: true,
              isOnline: true,
              lastSeenAt: true,
              lastActiveAt: true,
              lastAssignedAt: true,
              personalFeeOverride: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where: whereUser }),
    ]);

    // ВАЖНО: фронт у тебя ждёт плоские поля (как раньше)
    const mapped = items
      .filter((u) => !!u.courierProfile)
      .map((u) => ({
        id: u.id,
        userId: u.id,
        phone: u.phone,
        isActive: u.isActive,
        createdAt: u.createdAt,
        firstName: u.courierProfile!.firstName,
        lastName: u.courierProfile!.lastName,
        iin: u.courierProfile!.iin,
        isOnline: u.courierProfile!.isOnline,
        lastSeenAt: u.courierProfile!.lastSeenAt,
        lastActiveAt: u.courierProfile!.lastActiveAt,
        lastAssignedAt: u.courierProfile!.lastAssignedAt,
        personalFeeOverride: u.courierProfile!.personalFeeOverride,
      }));

    return { items: mapped, meta: { page: p, limit: l, total } };
  }

  async getOne(user: JwtUser, courierUserId: string) {
    this.ensureAdmin(user);

    const u = await this.prisma.user.findUnique({
      where: { id: courierUserId },
      select: {
        id: true,
        phone: true,
        isActive: true,
        createdAt: true,
        courierProfile: {
          select: {
            firstName: true,
            lastName: true,
            iin: true,
            isOnline: true,
            lastSeenAt: true,
            lastActiveAt: true,
            lastAssignedAt: true,
            personalFeeOverride: true,
            notes: {
              orderBy: { createdAt: 'desc' },
              take: 20,
              select: { id: true, text: true, createdAt: true },
            },
          },
        },
      },
    });

    if (!u || !u.courierProfile) throw new NotFoundException('Courier not found');

    const now = new Date();
    const activeTariff = await this.prisma.courierTariff.findFirst({
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      orderBy: { startsAt: 'desc' },
      select: { fee: true, startsAt: true, endsAt: true },
    });

    return {
      id: u.id,
      userId: u.id,
      phone: u.phone,
      isActive: u.isActive,
      createdAt: u.createdAt,
      ...u.courierProfile,
      activeTariff,
    };
  }

  async create(
    user: JwtUser,
    dto: { phone: string; password: string; firstName: string; lastName: string; iin: string },
  ) {
    this.ensureAdmin(user);

    if (!dto.phone || !dto.password) throw new BadRequestException('phone/password required');
    if (!dto.firstName || !dto.lastName || !dto.iin)
      throw new BadRequestException('firstName/lastName/iin required');

    const exists = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      select: { id: true },
    });
    if (exists) throw new BadRequestException('Phone already exists');

    const hash = await bcrypt.hash(dto.password, 10);

    const created = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        role: 'COURIER',
        passwordHash: hash,
        isActive: true,
        courierProfile: {
          create: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            iin: dto.iin,
            isOnline: false,
            lastSeenAt: null,
            lastActiveAt: null,
            lastAssignedAt: null,
          },
        },
      },
      select: {
        id: true,
        phone: true,
        role: true,
        isActive: true,
        courierProfile: { select: { firstName: true, lastName: true, iin: true, isOnline: true } },
      },
    });

    return created;
  }

  async setPassword(user: JwtUser, courierUserId: string, password: string) {
    this.ensureAdmin(user);
    if (!password) throw new BadRequestException('password required');

    const u = await this.prisma.user.findUnique({
      where: { id: courierUserId },
      select: { id: true, role: true },
    });
    if (!u || u.role !== 'COURIER') throw new NotFoundException('Courier not found');

    const hash = await bcrypt.hash(password, 10);

    await this.prisma.user.update({
      where: { id: courierUserId },
      data: { passwordHash: hash },
    });

    return { ok: true };
  }

  async setActive(user: JwtUser, courierUserId: string, isActive: boolean) {
    this.ensureAdmin(user);

    const u = await this.prisma.user.findUnique({
      where: { id: courierUserId },
      select: { id: true, role: true },
    });
    if (!u || u.role !== 'COURIER') throw new NotFoundException('Courier not found');

    await this.prisma.user.update({
      where: { id: courierUserId },
      data: { isActive },
    });

    return { ok: true, courierUserId, isActive };
  }

  async setOnline(
    user: JwtUser,
    courierUserId: string,
    isOnline: boolean,
    meta?: { source?: string; reason?: string },
  ) {
    this.ensureAdmin(user);

    const c = await this.prisma.courierProfile.findUnique({
      where: { userId: courierUserId },
      select: { userId: true, isOnline: true },
    });
    if (!c) throw new NotFoundException('Courier not found');

    const now = new Date();

    // 1) обновляем профиль
    const updated = await this.prisma.courierProfile.update({
      where: { userId: courierUserId },
      data: {
        isOnline,
        lastSeenAt: now,
        lastActiveAt: now,
      },
      select: { userId: true, isOnline: true, lastSeenAt: true, lastActiveAt: true },
    });

    // 2) пишем событие для метрики "онлайн по времени"
    //    (если статус не менялся — всё равно пишем, это полезно как heartbeat)
    await this.prisma.courierOnlineEvent.create({
      data: {
        courierUserId,
        isOnline,
      },
      select: { id: true },
    });

    return updated;
  }

  async setPersonalFee(user: JwtUser, courierUserId: string, fee: number | null) {
    this.ensureAdmin(user);

    const c = await this.prisma.courierProfile.findUnique({
      where: { userId: courierUserId },
      select: { userId: true },
    });
    if (!c) throw new NotFoundException('Courier not found');

    const val = fee == null ? null : Math.max(0, Math.round(Number(fee)));
    return this.prisma.courierProfile.update({
      where: { userId: courierUserId },
      data: { personalFeeOverride: val },
      select: { userId: true, personalFeeOverride: true },
    });
  }

  async addNote(user: JwtUser, courierUserId: string, text: string) {
    this.ensureAdmin(user);
    if (!text || !text.trim()) throw new BadRequestException('text required');

    const c = await this.prisma.courierProfile.findUnique({
      where: { userId: courierUserId },
      select: { userId: true },
    });
    if (!c) throw new NotFoundException('Courier not found');

    return this.prisma.courierNote.create({
      data: {
        courierUserId,
        authorUserId: user.id,
        text: text.trim(),
      },
      select: { id: true, text: true, createdAt: true },
    });
  }

  async getActiveTariff(user: JwtUser) {
    this.ensureAdmin(user);
    const now = new Date();
    const t = await this.prisma.courierTariff.findFirst({
      where: { isActive: true, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      orderBy: { startsAt: 'desc' },
    });
    return { active: t ?? null };
  }

  async setTariff(user: JwtUser, dto: { fee: number; startsAt?: string; endsAt?: string | null }) {
    this.ensureAdmin(user);

    const fee = Math.max(0, Math.round(Number(dto.fee)));
    if (!fee) throw new BadRequestException('fee must be > 0');

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : new Date();
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;

    await this.prisma.courierTariff.updateMany({
      where: { isActive: true, endsAt: null },
      data: { endsAt: startsAt },
    });

    const created = await this.prisma.courierTariff.create({
      data: { fee, startsAt, endsAt, isActive: true },
      select: { id: true, fee: true, startsAt: true, endsAt: true, isActive: true },
    });

    return created;
  }
}