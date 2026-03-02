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
exports.RestaurantsController = void 0;
const common_1 = require("@nestjs/common");
const restaurants_service_1 = require("./restaurants.service");
const create_restaurant_dto_1 = require("./dto/create-restaurant.dto");
let RestaurantsController = class RestaurantsController {
    restaurants;
    constructor(restaurants) {
        this.restaurants = restaurants;
    }
    getFinanceConfig() {
        return this.restaurants.getFinanceConfig();
    }
    updateFinanceConfig(body) {
        return this.restaurants.updateFinanceConfig(body);
    }
    getRestaurantCommissionDefault() {
        return this.restaurants.getRestaurantCommissionDefault();
    }
    setRestaurantCommissionDefault(body) {
        return this.restaurants.setRestaurantCommissionDefault(body?.restaurantCommissionPctDefault);
    }
    findAll(q, status) {
        return this.restaurants.findAll(q, status);
    }
    list(random) {
        return this.restaurants.list({
            random: random === '1' || random === 'true',
        });
    }
    getOne(id) {
        return this.restaurants.getOne(id);
    }
    create(dto) {
        return this.restaurants.create(dto);
    }
    setInApp(id, body) {
        return this.restaurants.setInApp(id, body?.isInApp);
    }
    setRestaurantCommissionOverride(id, body) {
        return this.restaurants.setRestaurantCommissionOverride(id, body?.restaurantCommissionPctOverride);
    }
    resetRestaurantCommissionOverride(id) {
        return this.restaurants.resetRestaurantCommissionOverride(id);
    }
    remove(id) {
        return this.restaurants.remove(id);
    }
    products(restaurantId, includeUnavailable) {
        return this.restaurants.products(restaurantId, {
            includeUnavailable: includeUnavailable === '1' || includeUnavailable === 'true',
        });
    }
};
exports.RestaurantsController = RestaurantsController;
__decorate([
    (0, common_1.Get)('finance/config'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RestaurantsController.prototype, "getFinanceConfig", null);
__decorate([
    (0, common_1.Patch)('finance/config'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RestaurantsController.prototype, "updateFinanceConfig", null);
__decorate([
    (0, common_1.Get)('commission/default'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RestaurantsController.prototype, "getRestaurantCommissionDefault", null);
__decorate([
    (0, common_1.Patch)('commission/default'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RestaurantsController.prototype, "setRestaurantCommissionDefault", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], RestaurantsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('public/list'),
    __param(0, (0, common_1.Query)('random')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RestaurantsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RestaurantsController.prototype, "getOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_restaurant_dto_1.CreateRestaurantDto]),
    __metadata("design:returntype", void 0)
], RestaurantsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id/in-app'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RestaurantsController.prototype, "setInApp", null);
__decorate([
    (0, common_1.Patch)(':id/commission'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RestaurantsController.prototype, "setRestaurantCommissionOverride", null);
__decorate([
    (0, common_1.Post)(':id/commission/reset'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RestaurantsController.prototype, "resetRestaurantCommissionOverride", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RestaurantsController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(':id/products'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('includeUnavailable')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], RestaurantsController.prototype, "products", null);
exports.RestaurantsController = RestaurantsController = __decorate([
    (0, common_1.Controller)('restaurants'),
    __metadata("design:paramtypes", [restaurants_service_1.RestaurantsService])
], RestaurantsController);
//# sourceMappingURL=restaurants.controller.js.map