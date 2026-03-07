"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestaurantMenuController = void 0;
const common_1 = require("@nestjs/common");
const restaurant_menu_service_1 = require("./restaurant-menu.service");
const create_product_dto_1 = require("./dto/create-product.dto");
const update_product_dto_1 = require("./dto/update-product.dto");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const fs = __importStar(require("fs"));
function ensureDir(dir) {
    try {
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
    }
    catch {
    }
}
function safeFileName(original) {
    const e = (0, path_1.extname)(original || '').toLowerCase();
    const ext = e && e.length <= 10 ? e : '.jpg';
    const base = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${base}${ext}`;
}
const productsUploadsDir = (0, path_1.join)(process.cwd(), 'uploads', 'products');
ensureDir(productsUploadsDir);
const productMulter = {
    storage: (0, multer_1.diskStorage)({
        destination: (_req, _file, cb) => {
            ensureDir(productsUploadsDir);
            cb(null, productsUploadsDir);
        },
        filename: (_req, file, cb) => {
            cb(null, safeFileName(file.originalname));
        },
    }),
    limits: {
        files: 11,
        fileSize: 10 * 1024 * 1024,
    },
};
let RestaurantMenuController = class RestaurantMenuController {
    service;
    constructor(service) {
        this.service = service;
    }
    async getMenu(restaurantId, includeUnavailable) {
        const flag = includeUnavailable === '1' || includeUnavailable === 'true';
        return this.service.getRestaurantMenu({
            restaurantId,
            includeUnavailable: flag,
        });
    }
    async createProduct(restaurantId, dto) {
        return this.service.createProduct({
            restaurantId,
            ...dto,
        });
    }
    async updateProduct(restaurantId, productId, dto) {
        return this.service.updateProduct({
            restaurantId,
            productId,
            dto,
        });
    }
    async uploadProductImages(restaurantId, productId, files) {
        const main = files?.main?.[0] || null;
        const others = files?.others || [];
        return this.service.setProductImages({
            restaurantId,
            productId,
            mainFile: main,
            otherFiles: others,
        });
    }
    async addProductImages(restaurantId, productId, files) {
        return this.service.addProductImages({
            restaurantId,
            productId,
            files: files || [],
        });
    }
    async setMain(restaurantId, productId, imageId) {
        return this.service.setMainProductImage({
            restaurantId,
            productId,
            imageId,
        });
    }
    async deleteImage(restaurantId, productId, imageId) {
        return this.service.deleteProductImage({
            restaurantId,
            productId,
            imageId,
        });
    }
    async deleteProduct(restaurantId, productId) {
        return this.service.deleteProduct({
            restaurantId,
            productId,
        });
    }
};
exports.RestaurantMenuController = RestaurantMenuController;
__decorate([
    (0, common_1.Get)(':id/menu'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('includeUnavailable')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RestaurantMenuController.prototype, "getMenu", null);
__decorate([
    (0, common_1.Post)(':id/menu/products'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_product_dto_1.CreateProductDto]),
    __metadata("design:returntype", Promise)
], RestaurantMenuController.prototype, "createProduct", null);
__decorate([
    (0, common_1.Patch)(':id/menu/products/:productId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_product_dto_1.UpdateProductDto]),
    __metadata("design:returntype", Promise)
], RestaurantMenuController.prototype, "updateProduct", null);
__decorate([
    (0, common_1.Post)(':id/menu/products/:productId/images'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([
        { name: 'main', maxCount: 1 },
        { name: 'others', maxCount: 10 },
    ], productMulter)),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], RestaurantMenuController.prototype, "uploadProductImages", null);
__decorate([
    (0, common_1.Post)(':id/menu/products/:productId/images/add'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('files', 10, productMulter)),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Array]),
    __metadata("design:returntype", Promise)
], RestaurantMenuController.prototype, "addProductImages", null);
__decorate([
    (0, common_1.Patch)(':id/menu/products/:productId/images/:imageId/main'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, common_1.Param)('imageId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], RestaurantMenuController.prototype, "setMain", null);
__decorate([
    (0, common_1.Delete)(':id/menu/products/:productId/images/:imageId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, common_1.Param)('imageId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], RestaurantMenuController.prototype, "deleteImage", null);
__decorate([
    (0, common_1.Delete)(':id/menu/products/:productId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RestaurantMenuController.prototype, "deleteProduct", null);
exports.RestaurantMenuController = RestaurantMenuController = __decorate([
    (0, common_1.Controller)('restaurants'),
    __metadata("design:paramtypes", [restaurant_menu_service_1.RestaurantMenuService])
], RestaurantMenuController);
//# sourceMappingURL=restaurant-menu.controller.js.map