import { Module } from '@nestjs/common';

import { PrismaModule } from './prisma/prisma.module';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

import { CouriersModule } from './couriers/couriers.module';
import { CouriersMapModule } from './couriers-map/couriers-map.module';
import { CourierMetricsModule } from './courier-metrics/courier-metrics.module';
import { TrackingModule } from './tracking/tracking.module';

import { OrdersModule } from './orders/orders.module';
import { PromoCodesModule } from './promo-codes/promo-codes.module';
import { FinanceModule } from './finance/finance.module';

import { RestaurantsModule } from './restaurants/restaurants.module';
import { RestaurantMenuModule } from './restaurant-menu/restaurant-menu.module';
import { RestaurantMetricsModule } from './restaurant-metrics/restaurant-metrics.module';
import { RestaurantReviewsModule } from './restaurant-reviews/restaurant-reviews.module';

import { ClientMetricsModule } from './client-metrics/client-metrics.module';
import { ClientReviewsModule } from './client-reviews/client-reviews.module';

import { FoodCategoriesModule } from './food-categories/food-categories.module';
import { HomeCmsModule } from './home-cms/home-cms.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    PrismaModule,

    // AUTH & USERS
    AuthModule,
    UsersModule,

    // COURIERS
    CouriersMapModule,
    CouriersModule,
    CourierMetricsModule,
    TrackingModule,

    // ORDERS & FINANCE
    OrdersModule,
    PromoCodesModule,
    FinanceModule,

    // RESTAURANTS
    RestaurantsModule,
    RestaurantMenuModule,
    RestaurantMetricsModule,
    RestaurantReviewsModule,

    // FOOD CATEGORIES
    FoodCategoriesModule,

    // HOME CMS
    HomeCmsModule,

    // CLIENT ANALYTICS
    ClientMetricsModule,
    ClientReviewsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}