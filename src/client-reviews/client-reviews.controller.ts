import { Controller, Get, Param, Query } from '@nestjs/common';
import { ClientReviewsService } from './client-reviews.service';

@Controller('users/customers')
export class ClientReviewsController {
  constructor(private readonly service: ClientReviewsService) {}

  // GET /users/customers/:id/reviews?includeOrder=1&page=1&limit=50
  @Get(':id/reviews')
  async getCustomerReviews(
    @Param('id') userId: string,
    @Query('includeOrder') includeOrder?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getCustomerReviews(userId, {
      includeOrder: includeOrder === '1' || includeOrder === 'true',
      page: Number(page || 1),
      limit: Number(limit || 50),
    });
  }
}
