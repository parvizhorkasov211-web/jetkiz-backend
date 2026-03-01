import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
  ParseIntPipe,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { OrderStatus } from '@prisma/client';

type JwtUser = {
  id: string;
  role?: 'CLIENT' | 'ADMIN' | 'COURIER' | 'RESTAURANT';
  restaurantId?: string;
  courierId?: string | null;
};

function toInt(v: any, def: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : def;
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateOrderDto) {
    return this.orders.createOrder(user.id, dto);
  }

  // Поиск заказа по номеру (цифрами)
  // ADMIN: любой заказ
  // CLIENT: только свой
  @UseGuards(JwtAuthGuard)
  @Get('by-number/:number')
  async getByNumber(
    @CurrentUser() user: JwtUser,
    @Param('number', ParseIntPipe) number: number,
  ) {
    const role = user.role ?? 'CLIENT';
    if (role === 'ADMIN') return this.orders.getAdminOrderByNumber(number);
    return this.orders.getOrderByNumber(user.id, number);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(
    @CurrentUser() user: JwtUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('status') status?: OrderStatus,
  ) {
    const role = user.role ?? 'CLIENT';
    const opts = { page: toInt(page, 1), limit: toInt(limit, 20) };

    if (role === 'CLIENT') {
      return this.orders.getMyOrders(user.id, opts);
    }

    if (role === 'ADMIN') {
      return this.orders.getAdminOrders({ ...opts, q, status });
    }

    throw new ForbiddenException('Forbidden');
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  my(
    @CurrentUser() user: JwtUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.orders.getMyOrders(user.id, {
      page: toInt(page, 1),
      limit: toInt(limit, 20),
    });
  }

  // ============================================================
  // FINANCE CONFIG (admin)
  // ============================================================
  @UseGuards(JwtAuthGuard)
  @Get('finance/config')
  getFinanceConfig(@CurrentUser() user: JwtUser) {
    return this.orders.getFinanceConfig(user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('finance/config')
  updateFinanceConfig(
    @CurrentUser() user: JwtUser,
    @Body()
    body: {
      clientDeliveryFeeDefault?: number;
      clientDeliveryFeeWeather?: number;
      courierPayoutDefault?: number;
      courierPayoutWeather?: number;
      weatherEnabled?: boolean;
    },
  ) {
    return this.orders.updateFinanceConfig(user, body);
  }

  // MANUAL override: client delivery fee for конкретного заказа
  @UseGuards(JwtAuthGuard)
  @Patch(':id/manual-delivery-fee')
  setManualDeliveryFee(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body('deliveryFee') deliveryFee: number,
  ) {
    return this.orders.setManualDeliveryFee(user, id, deliveryFee);
  }

  // UUID или number — сервис сам разрулит
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    const role = user.role ?? 'CLIENT';
    if (role === 'ADMIN') return this.orders.getAdminOrderById(id);
    return this.orders.getOrderById(user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
  ) {
    return this.orders.updateOrderStatus(user, id, status);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/assign-courier')
  assignCourier(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body('courierUserId') courierUserId: string,
  ) {
    return this.orders.assignCourier(user, id, courierUserId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/unassign-courier')
  unassignCourier(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.orders.unassignCourier(user, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/auto-assign')
  autoAssign(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.orders.autoAssignCourier(user, id);
  }
}