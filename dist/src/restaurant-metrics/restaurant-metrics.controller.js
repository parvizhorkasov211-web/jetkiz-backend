"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestaurantMetricsController = void 0;
const common_1 = require("@nestjs/common");
const restaurant_metrics_service_1 = require("./restaurant-metrics.service");
let RestaurantMetricsController = class RestaurantMetricsController {
    service;
    constructor(service) {
        this.service = service;
    }
    async getRestaurantMetrics(restaurantId, days, from, to) {
        const daysNum = days ? Number(days) : undefined;
        return this.service.getRestaurantMetrics({
            restaurantId,
            days: Number.isFinite(daysNum) ? daysNum : undefined,
            from,
            to,
        });
    }
};
exports.RestaurantMetricsController = RestaurantMetricsController;
__decorate([
    (0, common_1.Get)(':id/metrics'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('days')),
    __param(2, (0, common_1.Query)('from')),
    __param(3, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], RestaurantMetricsController.prototype, "getRestaurantMetrics", null);
exports.RestaurantMetricsController = RestaurantMetricsController = __decorate([
    (0, common_1.Controller)('restaurants'),
    __metadata("design:paramtypes", [restaurant_metrics_service_1.RestaurantMetricsService])
], RestaurantMetricsController);
//# sourceMappingURL=restaurant-metrics.controller.js.map