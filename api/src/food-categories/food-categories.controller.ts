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
import { FoodCategoriesService } from './food-categories.service';
import { CreateFoodCategoryDto } from './dto/create-food-category.dto';
import { UpdateFoodCategoryDto } from './dto/update-food-category.dto';

@Controller()
export class FoodCategoriesController {
  constructor(private readonly service: FoodCategoriesService) {}

  @Post('food-categories')
  async create(@Body() dto: CreateFoodCategoryDto) {
    return this.service.create(dto);
  }

  @Get('food-categories')
  async list(@Query('restaurantId') restaurantId?: string) {
    return this.service.listByRestaurant(restaurantId || '');
  }

  // PATCH /restaurants/:id/categories/:categoryId
  @Patch('restaurants/:id/categories/:categoryId')
  async update(
    @Param('id') restaurantId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateFoodCategoryDto,
  ) {
    return this.service.update({
      restaurantId,
      categoryId,
      dto,
    });
  }

  // DELETE /restaurants/:id/categories/:categoryId?force=true
  @Delete('restaurants/:id/categories/:categoryId')
  async delete(
    @Param('id') restaurantId: string,
    @Param('categoryId') categoryId: string,
    @Query('force') force?: string,
  ) {
    const forceDelete = force === 'true' || force === '1';

    return this.service.delete({
      restaurantId,
      categoryId,
      force: forceDelete,
    });
  }
}