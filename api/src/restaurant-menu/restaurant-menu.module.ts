import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RestaurantMenuController } from './restaurant-menu.controller';
import { RestaurantMenuService } from './restaurant-menu.service';

@Module({
  imports: [PrismaModule],
  controllers: [RestaurantMenuController],
  providers: [RestaurantMenuService],
})
export class RestaurantMenuModule {}