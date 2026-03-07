import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RestaurantReviewsController } from './restaurant-reviews.controller';
import { RestaurantReviewsService } from './restaurant-reviews.service';

@Module({
  imports: [PrismaModule],
  controllers: [RestaurantReviewsController],
  providers: [RestaurantReviewsService],
})
export class RestaurantReviewsModule {}
