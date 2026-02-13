import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // POST /orders
  @Post()
  create(@Req() req: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(req.user.id, dto);
  }

  // GET /orders/my?page=1&limit=20
  @Get('my')
  async my(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    const p = Math.max(1, Number(page ?? 1) || 1);
    const l = Math.min(50, Math.max(1, Number(limit ?? 20) || 20));

    const { items, total } = await this.ordersService.getMyOrders(req.user.id, { page: p, limit: l });

    return {
      data: items,
      meta: {
        page: p,
        limit: l,
        total,
        pages: Math.max(1, Math.ceil(total / l)),
      },
    };
  }

  // GET /orders/:id
  @Get(':id')
  getOne(@Req() req: any, @Param('id') id: string) {
    return this.ordersService.getOrderById(req.user.id, id);
  }

  // PATCH /orders/:id/status  (ADMIN/RESTAURANT; CLIENT запрещён)
  @Patch(':id/status')
  updateStatus(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateOrderStatus(req.user, id, dto.status);
  }
}
