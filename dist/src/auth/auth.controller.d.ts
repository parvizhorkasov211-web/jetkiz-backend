import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
    requestCode(body: {
        phone: string;
    }): Promise<{
        phone: string;
        code: string;
        expiresAt: Date;
    }>;
    verifyCode(body: {
        phone: string;
        code: string;
    }): Promise<{
        accessToken: string;
    }>;
    loginPassword(body: {
        phone: string;
        password: string;
    }): Promise<{
        accessToken: string;
    }>;
    devAdminToken(): Promise<{
        accessToken: string;
    }>;
}
