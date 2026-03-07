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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
function normalizePhone(input) {
    const raw = (input ?? '').trim();
    let digits = raw.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('8')) {
        digits = '7' + digits.slice(1);
    }
    return digits;
}
let AuthService = class AuthService {
    prisma;
    jwt;
    constructor(prisma, jwt) {
        this.prisma = prisma;
        this.jwt = jwt;
    }
    async requestCode(phone) {
        const p = normalizePhone(phone);
        const code = '1234';
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await this.prisma.user.upsert({
            where: { phone: p },
            update: { otpCode: code, otpExpiresAt: expiresAt },
            create: { phone: p, otpCode: code, otpExpiresAt: expiresAt, role: client_1.UserRole.CLIENT },
        });
        return { phone: p, code, expiresAt };
    }
    async verifyCode(phone, code) {
        const p = normalizePhone(phone);
        const user = await this.prisma.user.findUnique({ where: { phone: p } });
        if (!user ||
            !user.otpCode ||
            !user.otpExpiresAt ||
            user.otpCode !== code ||
            user.otpExpiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Invalid code');
        }
        if (user.isActive === false) {
            throw new common_1.UnauthorizedException('User is inactive');
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: { otpCode: null, otpExpiresAt: null },
        });
        const accessToken = await this.jwt.signAsync({
            sub: user.id,
            role: user.role,
        });
        return { accessToken };
    }
    async loginWithPassword(phone, password) {
        const p = normalizePhone(phone);
        const user = await this.prisma.user.findUnique({
            where: { phone: p },
            select: {
                id: true,
                role: true,
                isActive: true,
                passwordHash: true,
            },
        });
        if (!user || user.isActive === false) {
            throw new common_1.UnauthorizedException('Unauthorized');
        }
        if (user.role !== client_1.UserRole.COURIER && user.role !== client_1.UserRole.ADMIN) {
            throw new common_1.UnauthorizedException('Use OTP login');
        }
        if (!user.passwordHash) {
            throw new common_1.UnauthorizedException('Password not set');
        }
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const accessToken = await this.jwt.signAsync({
            sub: user.id,
            role: user.role,
        });
        return { accessToken };
    }
    async devAdminToken() {
        if (process.env.NODE_ENV === 'production') {
            throw new common_1.UnauthorizedException('Disabled');
        }
        const admin = await this.prisma.user.findFirst({
            where: { role: client_1.UserRole.ADMIN, isActive: true },
            select: { id: true, role: true },
        });
        if (!admin) {
            throw new common_1.UnauthorizedException('Admin not found');
        }
        const accessToken = await this.jwt.signAsync({
            sub: admin.id,
            role: admin.role,
        });
        return { accessToken };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map