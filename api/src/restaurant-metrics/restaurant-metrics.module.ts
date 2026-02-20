import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RestaurantMetricsController } from './restaurant-metrics.controller';
import { RestaurantMetricsService } from './restaurant-metrics.service';

@Module({
  imports: [PrismaModule],
  controllers: [RestaurantMetricsController],
  providers: [RestaurantMetricsService],
})
export class RestaurantMetricsModule {}
