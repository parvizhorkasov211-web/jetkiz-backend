import { Module } from '@nestjs/common';
import { FoodCategoriesController } from './food-categories.controller';
import { FoodCategoriesService } from './food-categories.service';

@Module({
  controllers: [FoodCategoriesController],
  providers: [FoodCategoriesService],
})
export class FoodCategoriesModule {}