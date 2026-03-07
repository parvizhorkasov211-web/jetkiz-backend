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
exports.CourierMetricsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../auth/jwt.guard");
const courier_metrics_service_1 = require("./courier-metrics.service");
let CourierMetricsController = class CourierMetricsController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    realtime(req) {
        return this.svc.realtime(req.user);
    }
    statusSummary(req) {
        return this.svc.statusSummary(req.user);
    }
    statusList(req, tab, limit) {
        return this.svc.statusList(req.user, {
            tab,
            limit: limit ? Number(limit) : undefined,
        });
    }
    byCourier(req, courierUserId, from, to) {
        return this.svc.byCourier(req.user, courierUserId, from, to);
    }
    onlineSeries(req, range, from, to) {
        return this.svc.onlineSeries(req.user, { range, from, to });
    }
    onlineTimeline(req, from, to, bucket) {
        return this.svc.onlineTimeline(req.user, { from, to, bucket });
    }
    onTimeRate(req, courierUserId, from, to, slaMin) {
        return this.svc.onTimeRate(req.user, courierUserId, from, to, slaMin ? Number(slaMin) : undefined);
    }
    completedCount(req, courierUserId, range, from, to) {
        return this.svc.completedCount(req.user, courierUserId, { range, from, to });
    }
};
exports.CourierMetricsController = CourierMetricsController;
__decorate([
    (0, common_1.Get)('realtime'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CourierMetricsController.prototype, "realtime", null);
__decorate([
    (0, common_1.Get)('status-summary'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CourierMetricsController.prototype, "statusSummary", null);
__decorate([
    (0, common_1.Get)('status-list'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('tab')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], CourierMetricsController.prototype, "statusList", null);
__decorate([
    (0, common_1.Get)('by-courier'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('courierUserId')),
    __param(2, (0, common_1.Query)('from')),
    __param(3, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], CourierMetricsController.prototype, "byCourier", null);
__decorate([
    (0, common_1.Get)('online-series'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('range')),
    __param(2, (0, common_1.Query)('from')),
    __param(3, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], CourierMetricsController.prototype, "onlineSeries", null);
__decorate([
    (0, common_1.Get)('online-timeline'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('bucket')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], CourierMetricsController.prototype, "onlineTimeline", null);
__decorate([
    (0, common_1.Get)('on-time-rate'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('courierUserId')),
    __param(2, (0, common_1.Query)('from')),
    __param(3, (0, common_1.Query)('to')),
    __param(4, (0, common_1.Query)('slaMin')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", void 0)
], CourierMetricsController.prototype, "onTimeRate", null);
__decorate([
    (0, common_1.Get)('completed-count'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('courierUserId')),
    __param(2, (0, common_1.Query)('range')),
    __param(3, (0, common_1.Query)('from')),
    __param(4, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", void 0)
], CourierMetricsController.prototype, "completedCount", null);
exports.CourierMetricsController = CourierMetricsController = __decorate([
    (0, common_1.Controller)('couriers/metrics'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [courier_metrics_service_1.CourierMetricsService])
], CourierMetricsController);
//# sourceMappingURL=courier-metrics.controller.js.map