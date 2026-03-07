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
exports.ClientMetricsController = void 0;
const common_1 = require("@nestjs/common");
const client_metrics_service_1 = require("./client-metrics.service");
let ClientMetricsController = class ClientMetricsController {
    service;
    constructor(service) {
        this.service = service;
    }
    realtime(req) {
        return this.service.realtime(req.user);
    }
    onlineTimeline(req, q) {
        return this.service.onlineTimeline(req.user, q);
    }
    byCourier(req, courierUserId, from, to) {
        return this.service.byCourier(req.user, courierUserId, from, to);
    }
};
exports.ClientMetricsController = ClientMetricsController;
__decorate([
    (0, common_1.Get)('realtime'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ClientMetricsController.prototype, "realtime", null);
__decorate([
    (0, common_1.Get)('online-timeline'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ClientMetricsController.prototype, "onlineTimeline", null);
__decorate([
    (0, common_1.Get)('by-courier'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('courierUserId')),
    __param(2, (0, common_1.Query)('from')),
    __param(3, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], ClientMetricsController.prototype, "byCourier", null);
exports.ClientMetricsController = ClientMetricsController = __decorate([
    (0, common_1.Controller)('client-metrics'),
    __metadata("design:paramtypes", [client_metrics_service_1.ClientMetricsService])
], ClientMetricsController);
//# sourceMappingURL=client-metrics.controller.js.map