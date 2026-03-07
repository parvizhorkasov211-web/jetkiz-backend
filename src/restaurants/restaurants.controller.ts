import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurants: RestaurantsService) {}

  // ======================================================
  // ✅ FINANCE CONFIG (admin)
  // GET /restaurants/finance/config
  // PATCH /restaurants/finance/config
  // ======================================================
  @Get('finance/config')
  getFinanceConfig() {
    return this.restaurants.getFinanceConfig();
  }

  @Patch('finance/config')
  updateFinanceConfig(
    @Body()
    body: {
      clientDeliveryFeeDefault?: number;
      clientDeliveryFeeWeather?: number;
      courierPayoutDefault?: number;
      courierPayoutWeather?: number;
      courierCommissionPctDefault?: number;
      restaurantCommissionPctDefault?: number;
      weatherEnabled?: boolean;
    },
  ) {
    return this.restaurants.updateFinanceConfig(body);
  }

  // ======================================================
  // COMMISSION DEFAULT (global)
  // ✅ GET /restaurants/commission/default
  // ✅ PATCH /restaurants/commission/default
  // ======================================================
  @Get('commission/default')
  getRestaurantCommissionDefault() {
    return this.restaurants.getRestaurantCommissionDefault();
  }

  @Patch('commission/default')
  setRestaurantCommissionDefault(
    @Body() body: { restaurantCommissionPctDefault?: number },
  ) {
    return this.restaurants.setRestaurantCommissionDefault(
      body?.restaurantCommissionPctDefault,
    );
  }

  // ======================================================
  // ADMIN LIST
  // ======================================================
  @Get()
  findAll(
    @Query('q') q?: string,
    @Query('status') status?: 'OPEN' | 'CLOSED',
  ) {
    return this.restaurants.findAll(q, status);
  }

  // ======================================================
  // CLIENT LIST
  // ======================================================
  @Get('public/list')
  list(@Query('random') random?: string) {
    return this.restaurants.list({
      random: random === '1' || random === 'true',
    });
  }

  // ======================================================
  // GET ONE
  // ======================================================
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.restaurants.getOne(id);
  }

  // ======================================================
  // CREATE
  // ======================================================
  @Post()
  create(@Body() dto: CreateRestaurantDto) {
    return this.restaurants.create(dto);
  }

  // ======================================================
  // IN-APP TOGGLE
  // ======================================================
  @Patch(':id/in-app')
  setInApp(
    @Param('id') id: string,
    @Body() body: { isInApp?: boolean },
  ) {
    return this.restaurants.setInApp(id, body?.isInApp);
  }

  // ======================================================
  // COMMISSION OVERRIDE ✅ PATCH /restaurants/:id/commission
  // ======================================================
  @Patch(':id/commission')
  setRestaurantCommissionOverride(
    @Param('id') id: string,
    @Body() body: { restaurantCommissionPctOverride?: number | null },
  ) {
    return this.restaurants.setRestaurantCommissionOverride(
      id,
      body?.restaurantCommissionPctOverride,
    );
  }

  // ======================================================
  // RESET ✅ POST /restaurants/:id/commission/reset
  // ======================================================
  @Post(':id/commission/reset')
  resetRestaurantCommissionOverride(@Param('id') id: string) {
    return this.restaurants.resetRestaurantCommissionOverride(id);
  }

  // ======================================================
  // DELETE
  // ======================================================
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.restaurants.remove(id);
  }

  // ======================================================
  // PRODUCTS
  // ======================================================
  @Get(':id/products')
  products(
    @Param('id') restaurantId: string,
    @Query('includeUnavailable') includeUnavailable?: string,
  ) {
    return this.restaurants.products(restaurantId, {
      includeUnavailable:
        includeUnavailable === '1' || includeUnavailable === 'true',
    });
  }
}