import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CourierMetricsService } from './courier-metrics.service';

@Controller('couriers/metrics')
@UseGuards(JwtAuthGuard)
export class CourierMetricsController {
  constructor(private readonly svc: CourierMetricsService) {}

  // realtime dashboard: /couriers/metrics/realtime
  @Get('realtime')
  realtime(@Req() req: any) {
    return this.svc.realtime(req.user);
  }

  // /couriers/metrics/status-summary
  @Get('status-summary')
  statusSummary(@Req() req: any) {
    return this.svc.statusSummary(req.user);
  }

  // /couriers/metrics/status-list?tab=ONLINE|OFFLINE|BUSY&limit=7
  @Get('status-list')
  statusList(
    @Req() req: any,
    @Query('tab') tab?: 'ONLINE' | 'OFFLINE' | 'BUSY',
    @Query('limit') limit?: string,
  ) {
    return this.svc.statusList(req.user, {
      tab,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // per courier: /couriers/metrics/by-courier?courierUserId=...&from=...&to=...
  @Get('by-courier')
  byCourier(
    @Req() req: any,
    @Query('courierUserId') courierUserId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.byCourier(req.user, courierUserId, from, to);
  }

  // /couriers/metrics/online-series?range=day|week|month&from=...&to=...
  @Get('online-series')
  onlineSeries(
    @Req() req: any,
    @Query('range') range?: 'day' | 'week' | 'month',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.onlineSeries(req.user, { range, from, to });
  }

  // /couriers/metrics/online-timeline?from=...&to=...&bucket=hour|day
  @Get('online-timeline')
  onlineTimeline(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('bucket') bucket?: 'hour' | 'day',
  ) {
    return this.svc.onlineTimeline(req.user, { from, to, bucket });
  }

  // ✅ NEW: /couriers/metrics/on-time-rate?courierUserId=...&from=...&to=...&slaMin=45
  @Get('on-time-rate')
  onTimeRate(
    @Req() req: any,
    @Query('courierUserId') courierUserId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('slaMin') slaMin?: string,
  ) {
    return this.svc.onTimeRate(req.user, courierUserId, from, to, slaMin ? Number(slaMin) : undefined);
  }

  // ✅ completed count:
  // /couriers/metrics/completed-count?courierUserId=...&range=day|month|year
  // /couriers/metrics/completed-count?courierUserId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
  @Get('completed-count')
  completedCount(
    @Req() req: any,
    @Query('courierUserId') courierUserId: string,
    @Query('range') range?: 'day' | 'month' | 'year',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.completedCount(req.user, courierUserId, { range, from, to });
  }
}