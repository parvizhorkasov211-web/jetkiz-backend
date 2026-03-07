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
exports.CouriersController = void 0;
const common_1 = require("@nestjs/common");
const couriers_service_1 = require("./couriers.service");
const jwt_guard_1 = require("../auth/jwt.guard");
const create_courier_dto_1 = require("./dto/create-courier.dto");
const update_courier_profile_dto_1 = require("./dto/update-courier-profile.dto");
const block_courier_dto_1 = require("./dto/block-courier.dto");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
function toInt(v, def) {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : def;
}
function safeExt(originalName) {
    const e = (0, path_1.extname)(originalName || '').toLowerCase();
    if (e === '.jpg' || e === '.jpeg' || e === '.png' || e === '.webp')
        return e;
    return '.jpg';
}
let CouriersController = class CouriersController {
    couriers;
    constructor(couriers) {
        this.couriers = couriers;
    }
    getActiveTariff(req) {
        return this.couriers.getActiveTariffPublic(req.user);
    }
    setGlobalTariff(req, body) {
        const fee = Number(body?.fee);
        if (!Number.isFinite(fee) || fee <= 0) {
            throw new common_1.BadRequestException('fee must be > 0');
        }
        return this.couriers.setGlobalTariff(req.user, { fee: Math.round(fee) });
    }
    getGlobalCommissionDefault(req) {
        return this.couriers.getGlobalCommissionDefault(req.user);
    }
    setGlobalCommissionDefault(req, body) {
        const pct = Number(body?.pct);
        if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
            throw new common_1.BadRequestException('pct must be between 0 and 100');
        }
        return this.couriers.setGlobalCommissionDefault(req.user, { pct: Math.round(pct) });
    }
    getStatusSummary(req) {
        return this.couriers.getCourierStatusSummary(req.user);
    }
    getOnlineTimeline(req) {
        return this.couriers.getCourierOnlineTimeline(req.user);
    }
    getOnlineSeries(req) {
        return this.couriers.getCourierOnlineSeries(req.user);
    }
    uploadMyAvatar(req, file) {
        return this.couriers.uploadMyAvatar(req.user, file);
    }
    getList(req, page, limit, q, online, active) {
        return this.couriers.getCouriersAdmin(req.user, {
            page: toInt(page, 1),
            limit: toInt(limit, 20),
            q,
            online,
            active,
        });
    }
    createCourier(req, dto) {
        return this.couriers.createCourier(req.user, dto);
    }
    getOne(req, id) {
        return this.couriers.getCourierAdminById(req.user, id);
    }
    uploadAvatar(req, id, file) {
        return this.couriers.uploadCourierAvatar(req.user, id, file);
    }
    updateProfile(req, id, dto) {
        return this.couriers.updateCourierProfile(req.user, id, dto);
    }
    blockCourier(req, id, dto) {
        return this.couriers.blockCourier(req.user, id, dto);
    }
    setOnline(req, id, body) {
        return this.couriers.setCourierOnline(req.user, id, {
            isOnline: body?.isOnline,
            source: body?.source,
        });
    }
    assignOrder(req, id, body) {
        return this.couriers.assignOrderToCourier(req.user, id, body);
    }
    unassignOrder(req, id, body) {
        return this.couriers.unassignOrderFromCourier(req.user, id, body);
    }
    getFinanceSummary(req, id, from, to) {
        return this.couriers.getCourierFinanceSummary(req.user, id, { from, to });
    }
    getFinanceLedger(req, id, page, limit, from, to) {
        return this.couriers.getCourierFinanceLedger(req.user, id, {
            page: toInt(page, 1),
            limit: toInt(limit, 50),
            from,
            to,
        });
    }
    createPayout(req, id, body) {
        return this.couriers.createCourierPayout(req.user, id, {
            amount: body?.amount,
            comment: body?.comment ?? null,
        });
    }
    setCommission(req, id, body) {
        return this.couriers.setCourierCommissionOverride(req.user, id, {
            commissionPctOverride: body?.commissionPctOverride === '' ? null : body?.commissionPctOverride,
        });
    }
    setPersonalFee(req, id, body) {
        const feeRaw = body?.fee;
        const fee = feeRaw == null ? null : Number(feeRaw);
        if (fee !== null && (!Number.isFinite(fee) || fee < 0)) {
            throw new common_1.BadRequestException('fee must be >= 0 or null');
        }
        return this.couriers.setCourierPersonalFeeOverride(req.user, id, {
            fee: fee === null ? null : Math.round(fee),
        });
    }
};
exports.CouriersController = CouriersController;
__decorate([
    (0, common_1.Get)('tariff/active'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CouriersController.prototype, "getActiveTariff", null);
__decorate([
    (0, common_1.Post)('tariff'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], CouriersController.prototype, "setGlobalTariff", null);
__decorate([
    (0, common_1.Get)('commission/default'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CouriersController.prototype, "getGlobalCommissionDefault", null);
__decorate([
    (0, common_1.Post)('commission/default'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], CouriersController.prototype, "setGlobalCommissionDefault", null);
__decorate([
    (0, common_1.Get)('metrics/status-summary'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CouriersController.prototype, "getStatusSummary", null);
__decorate([
    (0, common_1.Get)('metrics/online-timeline'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CouriersController.prototype, "getOnlineTimeline", null);
__decorate([
    (0, common_1.Get)('metrics/online-series'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CouriersController.prototype, "getOnlineSeries", null);
__decorate([
    (0, common_1.Post)('me/avatar'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: 'uploads/couriers',
            filename: (req, file, cb) => {
                const userId = req?.user?.id || 'unknown';
                const ext = safeExt(file.originalname);
                cb(null, `${userId}-${Date.now()}${ext}`);
            },
        }),
        fileFilter: (req, file, cb) => {
            const ok = file.mimetype === 'image/jpeg' ||
                file.mimetype === 'image/png' ||
                file.mimetype === 'image/webp';
            cb(ok ? null : new Error('Only jpeg/png/webp'), ok);
        },
        limits: { fileSize: 5 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], CouriersController.prototype, "uploadMyAvatar", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('q')),
    __param(4, (0, common_1.Query)('online')),
    __param(5, (0, common_1.Query)('active')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], CouriersController.prototype, "getList", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_courier_dto_1.CreateCourierDto]),
    __metadata("design:returntype", void 0)
], CouriersController.prototype, "createCourier", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CouriersController.prototype, "getOne", null);
__decorate([
    (0, common_1.Post)(':id/avatar'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: 'uploads/couriers',
            filename: (req, file, cb) => {
                const userId = req?.params?.id || 'unknown';
                const ext = safeExt(file.originalname);
                cb(null, `${userId}-${Date.now()}${ext}`);
            },
        }),
        fileFilter: (req, file, cb) => {
            const ok = file.mimetype === 'image/jpeg' ||
                file.mimetype === 'image/png' ||
                file.mimetype === 'image/webp';
            cb(ok ? null : new Error('Only jpeg/png/webp'), ok);
        },
        limits: { fileSize: 5 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], CouriersController.prototype, "uploadAvatar", null);
__decorate([
    (0, common_1.Patch)(':id/profile'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_courier_profile_dto_1.UpdateCourierProfileDto]),
    __metadata("design:returntype", void 0)
], CouriersController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Patch)(':id/blocked'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, block_courier_dto_1.BlockCourierDto]),
    __metadata("design:returntype", void 0)
], CouriersController.prototype, "blockCourier", null);
__decorate([
    (0, common_1.Patch)(':id/online'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], CouriersController.prototype, "setOnline", null);
__decorate([
    (0, common_1.Post)(':id/assign-order'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], CouriersController.prototype, "assignOrder", null);
__decorate([
    (0, common_1.Post)(':id/unassign-order'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], CouriersController.prototype, "unassignOrder", null);
__decorate([
    (0, common_1.Get)(':id/finance/summary'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('from')),
    __param(3, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], CouriersController.prototype, "getFinanceSummary", null);
__decorate([
    (0, common_1.Get)(':id/finance/ledger'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('from')),
    __param(5, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], CouriersController.prototype, "getFinanceLedger", null);
__decorate([
    (0, common_1.Post)(':id/finance/payout'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], CouriersController.prototype, "createPayout", null);
__decorate([
    (0, common_1.Patch)(':id/finance/commission'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], CouriersController.prototype, "setCommission", null);
__decorate([
    (0, common_1.Patch)(':id/personal-fee'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], CouriersController.prototype, "setPersonalFee", null);
exports.CouriersController = CouriersController = __decorate([
    (0, common_1.Controller)('couriers'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [couriers_service_1.CouriersService])
], CouriersController);
//# sourceMappingURL=couriers.controller.js.map