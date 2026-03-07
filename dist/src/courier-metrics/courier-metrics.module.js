"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourierMetricsModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../prisma/prisma.module");
const courier_metrics_controller_1 = require("./courier-metrics.controller");
const courier_metrics_service_1 = require("./courier-metrics.service");
let CourierMetricsModule = class CourierMetricsModule {
};
exports.CourierMetricsModule = CourierMetricsModule;
exports.CourierMetricsModule = CourierMetricsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [courier_metrics_controller_1.CourierMetricsController],
        providers: [courier_metrics_service_1.CourierMetricsService],
    })
], CourierMetricsModule);
//# sourceMappingURL=courier-metrics.module.js.map