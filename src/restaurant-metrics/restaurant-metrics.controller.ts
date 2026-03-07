import { Controller, Get, Param, Query } from '@nestjs/common';
import { RestaurantMetricsService } from './restaurant-metrics.service';

@Controller('restaurants')
export class RestaurantMetricsController {
  constructor(private readonly service: RestaurantMetricsService) {}

  /**
   * GET /restaurants/:id/metrics?days=90
   * GET /restaurants/:id/metrics?from=2026-02-10&to=2026-02-20
   */
  @Get(':id/metrics')
  async getRestaurantMetrics(
    @Param('id') restaurantId: string,
    @Query('days') days?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const daysNum = days ? Number(days) : undefined;

    return this.service.getRestaurantMetrics({
      restaurantId,
      days: Number.isFinite(daysNum as number) ? (daysNum as number) : undefined,
      from,
      to,
    });
  }
}
