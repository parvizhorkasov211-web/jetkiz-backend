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
import { RestaurantMenuService } from './restaurant-menu.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('restaurants')
export class RestaurantMenuController {
  constructor(private readonly service: RestaurantMenuService) {}

  // GET /restaurants/:id/menu?includeUnavailable=1
  @Get(':id/menu')
  async getMenu(
    @Param('id') restaurantId: string,
    @Query('includeUnavailable') includeUnavailable?: string,
  ) {
    const flag = includeUnavailable === '1' || includeUnavailable === 'true';
    return this.service.getRestaurantMenu({
      restaurantId,
      includeUnavailable: flag,
    });
  }

  // POST /restaurants/:id/menu/products
  @Post(':id/menu/products')
  async createProduct(
    @Param('id') restaurantId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.service.createProduct({
      restaurantId,
      ...dto,
    });
  }

  // PATCH /restaurants/:id/menu/products/:productId
  @Patch(':id/menu/products/:productId')
  async updateProduct(
    @Param('id') restaurantId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.service.updateProduct({
      restaurantId,
      productId,
      dto,
    });
  }

  // DELETE /restaurants/:id/menu/products/:productId
  @Delete(':id/menu/products/:productId')
  async deleteProduct(
    @Param('id') restaurantId: string,
    @Param('productId') productId: string,
  ) {
    return this.service.deleteProduct({
      restaurantId,
      productId,
    });
  }
}