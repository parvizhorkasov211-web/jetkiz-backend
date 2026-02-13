import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async requestCode(phone: string) {
    const code = '1234'; // DEV OTP
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.prisma.user.upsert({
      where: { phone },
      update: { otpCode: code, otpExpiresAt: expiresAt },
      create: { phone, otpCode: code, otpExpiresAt: expiresAt, role: UserRole.CLIENT },
    });

    return { phone, code, expiresAt };
  }

  async verifyCode(phone: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { phone } });

    if (
      !user ||
      !user.otpCode ||
      !user.otpExpiresAt ||
      user.otpCode !== code ||
      user.otpExpiresAt < new Date()
    ) {
      throw new UnauthorizedException('Invalid code');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpCode: null, otpExpiresAt: null },
    });

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
    });

    return { accessToken };
  }
}
