import { Controller, Get, Param, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { CustomerMetricsService } from './customer-metrics.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly customerMetrics: CustomerMetricsService,
  ) {}

  // GET /users/customers?page=1&limit=20&q=...&segment=...
  @Get('customers')
  customers(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('q') q?: string,
    @Query('segment') segment?: string,
  ) {
    return this.users.getCustomers(
      Number(page) || 1,
      Number(limit) || 20,
      q,
      segment,
    );
  }

  // GET /users/customers/:id
  @Get('customers/:id')
  customer(@Param('id') id: string) {
    return this.users.getCustomerDetails(id);
  }

  // GET /users/customers/:id/metrics
  @Get('customers/:id/metrics')
  customerMetricsById(@Param('id') id: string) {
    return this.customerMetrics.getMetrics(id);
  }

  // GET /users/customers/:id/orders?page=1&limit=20
  @Get('customers/:id/orders')
  customerOrders(
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.users.getCustomerOrders(
      id,
      Number(page) || 1,
      Number(limit) || 20,
    );
  }
}
