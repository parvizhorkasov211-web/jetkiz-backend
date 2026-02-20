import { Controller, Get, Param, Query } from '@nestjs/common';
import { RestaurantReviewsService } from './restaurant-reviews.service';

@Controller('restaurants')
export class RestaurantReviewsController {
  constructor(private readonly service: RestaurantReviewsService) {}

  // GET /restaurants/:id/reviews?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&limit=30&includeUser=1&includeOrder=1
  @Get(':id/reviews')
  async getRestaurantReviews(
    @Param('id') restaurantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('includeUser') includeUser?: string,
    @Query('includeOrder') includeOrder?: string,
  ) {
    return this.service.getRestaurantReviews({
      restaurantId,
      from,
      to,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 30,
      includeUser: includeUser === '1' || includeUser === 'true',
      includeOrder: includeOrder === '1' || includeOrder === 'true',
    });
  }
}
