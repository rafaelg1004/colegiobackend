// ================================================
// src/auth/guards/jwt-auth.guard.ts
// ================================================
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    const token = authHeader ? authHeader.substring(0, 50) : 'NO HEADER';

    console.log('🛡️ JWT Guard Check:', {
      hasUser: !!user,
      hasAuthHeader: !!authHeader,
      error: err?.message || null,
      info: info?.message || info?.name || null,
      tokenPreview: token + '...',
      fullError: err,
      fullInfo: info
    });

    if (err || !user) {
      const errorMsg = err?.message || info?.message || 'Token inválido o expirado';
      console.error('❌ Auth failed:', errorMsg);
      throw new UnauthorizedException(errorMsg);
    }

    return user;
  }
}
