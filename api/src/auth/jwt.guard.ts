import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();

    // ================================
    // DEV MODE: полностью отключаем JWT
    // ================================
    if (process.env.AUTH_DISABLED === 'true') {
      // Можно задавать роль для теста:
      // По умолчанию ADMIN, но можно передать заголовок:
      // x-dev-role: COURIER
      const devRole = String(req.headers['x-dev-role'] ?? 'ADMIN').toUpperCase();

      req.user = {
        id: devRole === 'COURIER' ? 'dev-courier' : 'dev-admin',
        role: devRole === 'COURIER' ? 'COURIER' : 'ADMIN',
      };

      return true;
    }

    // ================================
    // Если метод/контроллер помечен @Public()
    // ================================
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context) as any;
  }
}