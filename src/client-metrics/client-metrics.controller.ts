import { Controller, Get, Query, Req } from '@nestjs/common';
import { ClientMetricsService } from './client-metrics.service';

@Controller('client-metrics')
export class ClientMetricsController {
  constructor(private readonly service: ClientMetricsService) {}

  @Get('realtime')
  realtime(@Req() req: any) {
    return this.service.realtime(req.user);
  }

  @Get('online-timeline')
  onlineTimeline(
    @Req() req: any,
    @Query() q: { range?: 'day' | 'week' | 'month'; from?: string; to?: string },
  ) {
    return this.service.onlineTimeline(req.user, q);
  }

  @Get('by-courier')
  byCourier(
    @Req() req: any,
    @Query('courierUserId') courierUserId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.byCourier(req.user, courierUserId, from, to);
  }
}