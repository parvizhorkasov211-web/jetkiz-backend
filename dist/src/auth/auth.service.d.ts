import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuthService {
    private readonly prisma;
    private readonly jwt;
    constructor(prisma: PrismaService, jwt: JwtService);
    requestCode(phone: string): Promise<{
        phone: string;
        code: string;
        expiresAt: Date;
    }>;
    verifyCode(phone: string, code: string): Promise<{
        accessToken: string;
    }>;
    loginWithPassword(phone: string, password: string): Promise<{
        accessToken: string;
    }>;
    devAdminToken(): Promise<{
        accessToken: string;
    }>;
}
