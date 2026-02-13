import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('request-code')
  requestCode(@Body('phone') phone: string) {
    return this.authService.requestCode(phone);
  }

  @Post('verify-code')
  verifyCode(@Body('phone') phone: string, @Body('code') code: string) {
    return this.authService.verifyCode(phone, code);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return req.user;
  }
}
