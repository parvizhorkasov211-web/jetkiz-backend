"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const couriers_module_1 = require("./couriers/couriers.module");
const courier_metrics_module_1 = require("./courier-metrics/courier-metrics.module");
const orders_module_1 = require("./orders/orders.module");
const restaurants_module_1 = require("./restaurants/restaurants.module");
const restaurant_menu_module_1 = require("./restaurant-menu/restaurant-menu.module");
const restaurant_metrics_module_1 = require("./restaurant-metrics/restaurant-metrics.module");
const restaurant_reviews_module_1 = require("./restaurant-reviews/restaurant-reviews.module");
const client_metrics_module_1 = require("./client-metrics/client-metrics.module");
const client_reviews_module_1 = require("./client-reviews/client-reviews.module");
const food_categories_module_1 = require("./food-categories/food-categories.module");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            couriers_module_1.CouriersModule,
            courier_metrics_module_1.CourierMetricsModule,
            orders_module_1.OrdersModule,
            restaurants_module_1.RestaurantsModule,
            restaurant_menu_module_1.RestaurantMenuModule,
            restaurant_metrics_module_1.RestaurantMetricsModule,
            restaurant_reviews_module_1.RestaurantReviewsModule,
            food_categories_module_1.FoodCategoriesModule,
            client_metrics_module_1.ClientMetricsModule,
            client_reviews_module_1.ClientReviewsModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map