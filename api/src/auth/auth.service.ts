import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

function normalizePhone(input: string) {
  const raw = (input ?? '').trim();

  let digits = raw.replace(/\D/g, '');

  if (digits.length === 11 && digits.startsWith('8')) {
    digits = '7' + digits.slice(1);
  }

  if (!digits) return '';

  return `+${digits}`;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // OTP для клиента (DEV)
  async requestCode(phone: string) {
    const p = normalizePhone(phone);
    const code = '1234';
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.prisma.user.upsert({
      where: { phone: p },
      update: { otpCode: code, otpExpiresAt: expiresAt },
      create: { phone: p, otpCode: code, otpExpiresAt: expiresAt, role: UserRole.CLIENT },
    });

    return { phone: p, code, expiresAt };
  }

  async verifyCode(phone: string, code: string) {
    const p = normalizePhone(phone);
    const user = await this.prisma.user.findUnique({ where: { phone: p } });

    if (
      !user ||
      !user.otpCode ||
      !user.otpExpiresAt ||
      user.otpCode !== code ||
      user.otpExpiresAt < new Date()
    ) {
      throw new UnauthorizedException('Invalid code');
    }

    if (user.isActive === false) {
      throw new UnauthorizedException('User is inactive');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpCode: null, otpExpiresAt: null },
    });

   const accessToken = await this.jwt.signAsync({
  userId: user.id,
  role: user.role,
});
    return { accessToken };
  }

  // ✅ Логин по паролю (курьер/админ)
  async loginWithPassword(phone: string, password: string) {
    const p = normalizePhone(phone);

    const user = await this.prisma.user.findUnique({
      where: { phone: p },
      select: {
        id: true,
        role: true,
        isActive: true,
        passwordHash: true,
      },
    });

    if (!user || user.isActive === false) {
      throw new UnauthorizedException('Unauthorized');
    }

    // только для ролей, кому мы заводим пароль
    if (user.role !== UserRole.COURIER && user.role !== UserRole.ADMIN) {
      throw new UnauthorizedException('Use OTP login');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Password not set');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

   const accessToken = await this.jwt.signAsync({
  userId: user.id,
  role: user.role,
});

    return { accessToken };
  }

  // ✅ DEV: токен админа без пароля (чтобы админка работала с API и не было Unauthorized)
  async devAdminToken() {
    if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException('Disabled');
    }

    const admin = await this.prisma.user.findFirst({
      where: { role: UserRole.ADMIN, isActive: true },
      select: { id: true, role: true },
    });

    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }

    const accessToken = await this.jwt.signAsync({
  userId: admin.id,
  role: admin.role,
});
    return { accessToken };
  }
}