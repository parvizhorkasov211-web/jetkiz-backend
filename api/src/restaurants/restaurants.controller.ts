import { Controller, Get, Param, Query } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurants: RestaurantsService) {}

  @Get()
  list(@Query('random') random?: string) {
    return this.restaurants.list({ random: random === '1' || random === 'true' });
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.restaurants.getOne(id);
  }

  @Get(':id/products')
  products(
    @Param('id') restaurantId: string,
    @Query('includeUnavailable') includeUnavailable?: string,
  ) {
    return this.restaurants.products(restaurantId, {
      includeUnavailable: includeUnavailable === '1' || includeUnavailable === 'true',
    });
  }
}
