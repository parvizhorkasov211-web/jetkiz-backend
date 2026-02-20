import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CourierMetricsController } from './courier-metrics.controller';
import { CourierMetricsService } from './courier-metrics.service';

@Module({
  imports: [PrismaModule],
  controllers: [CourierMetricsController],
  providers: [CourierMetricsService],
})
export class CourierMetricsModule {}
