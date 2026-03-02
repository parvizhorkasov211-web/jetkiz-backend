import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClientMetricsController } from './client-metrics.controller';
import { ClientMetricsService } from './client-metrics.service';

@Module({
  controllers: [ClientMetricsController],
  providers: [ClientMetricsService, PrismaService],
  exports: [ClientMetricsService],
})
export class ClientMetricsModule {}