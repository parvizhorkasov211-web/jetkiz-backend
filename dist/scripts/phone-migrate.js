"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
function normalizePhone(input) {
    const raw = String(input ?? '').trim();
    let digits = raw.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('8')) {
        digits = '7' + digits.slice(1);
    }
    return digits;
}
async function main() {
    const url = process.env.DATABASE_URL;
    if (!url)
        throw new Error('DATABASE_URL is not set');
    const pool = new pg_1.Pool({ connectionString: url });
    const adapter = new adapter_pg_1.PrismaPg(pool);
    const prisma = new client_1.PrismaClient({ adapter });
    try {
        const users = await prisma.user.findMany({ select: { id: true, phone: true } });
        const map = new Map();
        for (const u of users) {
            const norm = normalizePhone(u.phone);
            if (!norm)
                continue;
            if (!map.has(norm))
                map.set(norm, []);
            map.get(norm).push({ id: u.id, phone: u.phone });
        }
        const duplicates = [...map.entries()].filter(([, arr]) => arr.length > 1);
        if (duplicates.length) {
            console.log('DUPLICATES AFTER NORMALIZE (resolve manually):');
            for (const [norm, arr] of duplicates)
                console.log(norm, arr);
            process.exitCode = 2;
            return;
        }
        let updated = 0;
        for (const u of users) {
            const norm = normalizePhone(u.phone);
            if (norm && norm !== u.phone) {
                await prisma.user.update({ where: { id: u.id }, data: { phone: norm } });
                updated++;
            }
        }
        console.log('DONE. updated:', updated);
    }
    finally {
        await prisma.$disconnect();
        await pool.end();
    }
}
main().catch((e) => {
    console.error('ERROR:', e);
    process.exit(1);
});
//# sourceMappingURL=phone-migrate.js.map