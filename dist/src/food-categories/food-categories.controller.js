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
exports.FoodCategoriesController = void 0;
const common_1 = require("@nestjs/common");
const food_categories_service_1 = require("./food-categories.service");
const create_food_category_dto_1 = require("./dto/create-food-category.dto");
const update_food_category_dto_1 = require("./dto/update-food-category.dto");
let FoodCategoriesController = class FoodCategoriesController {
    service;
    constructor(service) {
        this.service = service;
    }
    async create(dto) {
        return this.service.create(dto);
    }
    async list(restaurantId) {
        return this.service.listByRestaurant(restaurantId || '');
    }
    async update(restaurantId, categoryId, dto) {
        return this.service.update({
            restaurantId,
            categoryId,
            dto,
        });
    }
    async delete(restaurantId, categoryId, force) {
        const forceDelete = force === 'true' || force === '1';
        return this.service.delete({
            restaurantId,
            categoryId,
            force: forceDelete,
        });
    }
};
exports.FoodCategoriesController = FoodCategoriesController;
__decorate([
    (0, common_1.Post)('food-categories'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_food_category_dto_1.CreateFoodCategoryDto]),
    __metadata("design:returntype", Promise)
], FoodCategoriesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('food-categories'),
    __param(0, (0, common_1.Query)('restaurantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FoodCategoriesController.prototype, "list", null);
__decorate([
    (0, common_1.Patch)('restaurants/:id/categories/:categoryId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('categoryId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_food_category_dto_1.UpdateFoodCategoryDto]),
    __metadata("design:returntype", Promise)
], FoodCategoriesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('restaurants/:id/categories/:categoryId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('categoryId')),
    __param(2, (0, common_1.Query)('force')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], FoodCategoriesController.prototype, "delete", null);
exports.FoodCategoriesController = FoodCategoriesController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [food_categories_service_1.FoodCategoriesService])
], FoodCategoriesController);
//# sourceMappingURL=food-categories.controller.js.map