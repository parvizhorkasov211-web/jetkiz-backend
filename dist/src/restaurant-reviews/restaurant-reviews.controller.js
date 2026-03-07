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
exports.RestaurantReviewsController = void 0;
const common_1 = require("@nestjs/common");
const restaurant_reviews_service_1 = require("./restaurant-reviews.service");
let RestaurantReviewsController = class RestaurantReviewsController {
    service;
    constructor(service) {
        this.service = service;
    }
    async getRestaurantReviews(restaurantId, from, to, page, limit, includeUser, includeOrder) {
        return this.service.getRestaurantReviews({
            restaurantId,
            from,
            to,
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 30,
            includeUser: includeUser === '1' || includeUser === 'true',
            includeOrder: includeOrder === '1' || includeOrder === 'true',
        });
    }
};
exports.RestaurantReviewsController = RestaurantReviewsController;
__decorate([
    (0, common_1.Get)(':id/reviews'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __param(5, (0, common_1.Query)('includeUser')),
    __param(6, (0, common_1.Query)('includeOrder')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], RestaurantReviewsController.prototype, "getRestaurantReviews", null);
exports.RestaurantReviewsController = RestaurantReviewsController = __decorate([
    (0, common_1.Controller)('restaurants'),
    __metadata("design:paramtypes", [restaurant_reviews_service_1.RestaurantReviewsService])
], RestaurantReviewsController);
//# sourceMappingURL=restaurant-reviews.controller.js.map