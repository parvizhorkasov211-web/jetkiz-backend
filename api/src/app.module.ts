import { Module } from '@nestjs/common';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { OrdersModule } from './orders/orders.module';
import { UsersModule } from './users/users.module';
import { ClientMetricsModule } from './client-metrics/client-metrics.module';
import { RestaurantReviewsModule } from './restaurant-reviews/restaurant-reviews.module';
import { RestaurantMetricsModule } from './restaurant-metrics/restaurant-metrics.module';

// ✅ NEW
import { CouriersModule } from './couriers/couriers.module';
import { CourierMetricsModule } from './courier-metrics/courier-metrics.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    RestaurantsModule,
    OrdersModule,
    UsersModule,
    ClientMetricsModule,
    RestaurantReviewsModule,
    RestaurantMetricsModule,

    // ✅ couriers
    CouriersModule,
    CourierMetricsModule,
  ],
})
export class AppModule {}
