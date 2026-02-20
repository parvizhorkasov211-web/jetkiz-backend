import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

type JwtPayload = {
  sub: string;
  role: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_ACCESS_SECRET ?? 'dev_access_secret',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        phone: true,
        role: true,
        isActive: true,
        courierProfile: { select: { userId: true } },
      },
    });

    if (!user || user.isActive === false) throw new UnauthorizedException('Unauthorized');

    return {
      id: user.id,
      phone: user.phone,
      role: user.role,
      restaurantId: null, // пока без привязки ресторанов
      courierId: user.courierProfile?.userId ?? null,
    };
  }
}
