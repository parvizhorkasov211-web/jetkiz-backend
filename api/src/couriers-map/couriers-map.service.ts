import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CouriersMapService {
  constructor(private readonly prisma: PrismaService) {}

  async getMapPoints() {
  return this.prisma.courierProfile.findMany({
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
}
}