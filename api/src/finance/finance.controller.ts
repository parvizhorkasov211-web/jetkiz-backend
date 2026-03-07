import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { FinanceService } from './finance.service';

type JwtUser = {
  id: string;
  role?: 'CLIENT' | 'ADMIN' | 'COURIER' | 'RESTAURANT';
};

type FinancePeriod = 'today' | 'yesterday' | '7d' | '30d' | 'custom';

@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  private ensureAdmin(user: JwtUser) {
    if ((user.role ?? 'CLIENT') !== 'ADMIN') {
      throw new ForbiddenException('Only admin');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('summary')
  getSummary(
    @CurrentUser() user: JwtUser,
    @Query('period') period?: FinancePeriod,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    this.ensureAdmin(user);
    return this.financeService.getSummary(period, from, to);
  }

  @UseGuards(JwtAuthGuard)
  @Get('restaurant-payouts/summary')
  getRestaurantPayoutsSummary(
    @CurrentUser() user: JwtUser,
    @Query('period') period?: FinancePeriod,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    this.ensureAdmin(user);
    return this.financeService.getRestaurantPayoutsSummary(
      period ?? '30d',
      from,
      to,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('restaurant-payouts')
  getRestaurantPayoutsList(
    @CurrentUser() user: JwtUser,
    @Query('restaurantId') restaurantId?: string,
  ) {
    this.ensureAdmin(user);
    return this.financeService.getRestaurantPayoutsList(restaurantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('restaurant-payouts/export')
  async exportRestaurantPayouts(
    @CurrentUser() user: JwtUser,
    @Query('period') period?: FinancePeriod,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('scope') scope?: 'pending' | 'assigned' | 'paid' | 'all',
    @Res() res?: Response,
  ) {
    this.ensureAdmin(user);

    const file = await this.financeService.exportRestaurantPayoutsToExcel({
      period: period ?? 'today',
      from,
      to,
      scope: scope ?? 'all',
    });

    res!.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res!.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );

    res!.send(file.buffer);
  }

  @UseGuards(JwtAuthGuard)
  @Post('restaurant-payouts')
  createRestaurantPayout(
    @CurrentUser() user: JwtUser,
    @Body()
    body: {
      restaurantId: string;
      periodFrom: string;
      periodTo: string;
      note?: string | null;
    },
  ) {
    this.ensureAdmin(user);

    return this.financeService.createRestaurantPayout({
      restaurantId: body.restaurantId,
      periodFrom: new Date(body.periodFrom),
      periodTo: new Date(body.periodTo),
      note: body.note ?? null,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Patch('restaurant-payouts/:id/pay')
  markRestaurantPayoutPaid(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body()
    body: {
      paymentReference: string;
      paymentComment?: string | null;
    },
  ) {
    this.ensureAdmin(user);
    return this.financeService.markRestaurantPayoutPaid(id, {
      paymentReference: body.paymentReference,
      paymentComment: body.paymentComment ?? null,
      paidByAdminId: user.id,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('courier-payouts/summary')
  getCourierPayoutsSummary(
    @CurrentUser() user: JwtUser,
    @Query('period') period?: FinancePeriod,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    this.ensureAdmin(user);
    return this.financeService.getCourierPayoutsSummary(
      period ?? '30d',
      from,
      to,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('courier-payouts')
  getCourierPayoutsList(
    @CurrentUser() user: JwtUser,
    @Query('courierUserId') courierUserId?: string,
  ) {
    this.ensureAdmin(user);
    return this.financeService.getCourierPayoutsList(courierUserId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('courier-payouts/export')
  async exportCourierPayouts(
    @CurrentUser() user: JwtUser,
    @Query('period') period?: FinancePeriod,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('scope') scope?: 'pending' | 'assigned' | 'paid' | 'all',
    @Res() res?: Response,
  ) {
    this.ensureAdmin(user);

    const file = await this.financeService.exportCourierPayoutsToExcel({
      period: period ?? 'today',
      from,
      to,
      scope: scope ?? 'all',
    });

    res!.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res!.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );

    res!.send(file.buffer);
  }

  @UseGuards(JwtAuthGuard)
  @Post('courier-payouts')
  createCourierPayout(
    @CurrentUser() user: JwtUser,
    @Body()
    body: {
      courierUserId: string;
      periodFrom: string;
      periodTo: string;
      note?: string | null;
    },
  ) {
    this.ensureAdmin(user);

    return this.financeService.createCourierPayout({
      courierUserId: body.courierUserId,
      periodFrom: new Date(body.periodFrom),
      periodTo: new Date(body.periodTo),
      note: body.note ?? null,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Patch('courier-payouts/:id/pay')
  markCourierPayoutPaid(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body()
    body: {
      paymentReference: string;
      paymentComment?: string | null;
    },
  ) {
    this.ensureAdmin(user);
    return this.financeService.markCourierPayoutPaid(id, {
      paymentReference: body.paymentReference,
      paymentComment: body.paymentComment ?? null,
      paidByAdminId: user.id,
    });
  }
}