// ================================================
// src/auth/guards/roles.guard.ts
// ================================================
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      ctx.getHandler(),
    );
    if (!requiredRoles) return true;

    const { user } = ctx.switchToHttp().getRequest();
    if (!requiredRoles.includes(user.rol)) {
      throw new ForbiddenException(
        `Acceso denegado. Se requiere rol: ${requiredRoles.join(' o ')}. Tu rol: ${user.rol}`,
      );
    }
    return true;
  }
}
