import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('request-code')
  requestCode(@Body() body: { phone: string }) {
    return this.auth.requestCode(body.phone);
  }

  @Post('verify-code')
  verifyCode(@Body() body: { phone: string; code: string }) {
    return this.auth.verifyCode(body.phone, body.code);
  }

  @Post('login-password')
  loginPassword(@Body() body: { phone: string; password: string }) {
    return this.auth.loginWithPassword(body.phone, body.password);
  }

  // ✅ DEV endpoint
  @Post('dev-admin-token')
  devAdminToken() {
    return this.auth.devAdminToken();
  }
}