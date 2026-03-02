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
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
const bcrypt = __importStar(require("bcryptjs"));
function normalizePhone(input) {
    const raw = String(input ?? '').trim();
    let digits = raw.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('8'))
        digits = '7' + digits.slice(1);
    return digits;
}
async function main() {
    const phoneInput = process.argv[2];
    const newPassword = process.argv[3];
    if (!phoneInput || !newPassword) {
        console.log('Usage: npx tsx scripts/reset-admin-password.ts <phone> <newPassword>');
        process.exit(1);
    }
    const url = process.env.DATABASE_URL;
    if (!url)
        throw new Error('DATABASE_URL is not set');
    const pool = new pg_1.Pool({ connectionString: url });
    const adapter = new adapter_pg_1.PrismaPg(pool);
    const prisma = new client_1.PrismaClient({ adapter });
    try {
        const phone = normalizePhone(phoneInput);
        const user = await prisma.user.findUnique({
            where: { phone },
            select: { id: true, phone: true, role: true, isActive: true },
        });
        if (!user) {
            console.log('User not found by phone:', phone);
            process.exit(2);
        }
        if (user.isActive === false) {
            console.log('User is inactive:', { id: user.id, phone: user.phone, role: user.role });
            process.exit(3);
        }
        if (user.role !== client_1.UserRole.ADMIN) {
            console.log('Warning: role is not ADMIN:', user.role);
        }
        const hash = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: hash },
        });
        console.log('OK: password updated for', { id: user.id, phone: user.phone, role: user.role });
    }
    finally {
        await prisma.$disconnect();
        await pool.end();
    }
}
main().catch((e) => {
    console.error('ERROR:', e);
    process.exit(99);
});
//# sourceMappingURL=reset-admin-password.js.map