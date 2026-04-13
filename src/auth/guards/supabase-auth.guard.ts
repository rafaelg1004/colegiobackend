// ================================================
// src/auth/guards/supabase-auth.guard.ts
// Ahora usa autenticación JWT local (PostgreSQL)
// ================================================
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../database/database.service';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private database: DatabaseService,
    private config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Extraer token del header o cookie
    let token = this.extractToken(request);

    if (!token) {
      console.log('🚫 No se encontró token en la petición');
      throw new UnauthorizedException(
        'No se proporcionó token de autenticación',
      );
    }

    try {
      // Verificar token JWT localmente
      const secret = this.config.get<string>('JWT_SECRET') || 'fallback-secret';
      const decoded = jwt.verify(token, secret) as {
        sub: string;
        email: string;
        rol: string;
      };

      // Obtener perfil del usuario
      const { data: perfil, error: perfilError } = await this.database.admin
        .from('perfil_usuario')
        .select('rol, empleado_id, acudiente_id, estudiante_id, activo')
        .eq('id', decoded.sub)
        .single();

      if (perfilError) {
        console.log('⚠️ No se encontró perfil, usando datos básicos del token');
      }

      // Adjuntar usuario al request
      request.user = {
        sub: decoded.sub,
        email: decoded.email,
        rol: perfil?.rol || decoded.rol || 'USUARIO',
        empleado_id: perfil?.empleado_id,
        acudiente_id: perfil?.acudiente_id,
        estudiante_id: perfil?.estudiante_id,
        activo: perfil?.activo ?? true,
      };

      console.log(
        '✅ Usuario autenticado (JWT local):',
        request.user.email,
        'Rol:',
        request.user.rol,
      );
      return true;
    } catch (err) {
      console.error('💥 Error en autenticación:', err.message);
      throw new UnauthorizedException('Error al verificar autenticación');
    }
  }

  private extractToken(request: any): string | null {
    // Intentar obtener del header Authorization
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Intentar obtener de cookies
    if (request.cookies && request.cookies['access_token']) {
      return request.cookies['access_token'];
    }

    return null;
  }
}
