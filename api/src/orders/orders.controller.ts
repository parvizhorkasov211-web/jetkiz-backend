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
