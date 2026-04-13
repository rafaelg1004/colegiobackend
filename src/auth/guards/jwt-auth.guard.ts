// ================================================
// src/auth/guards/jwt-auth.guard.ts
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
export class JwtAuthGuard implements CanActivate {
  constructor(
    private database: DatabaseService,
    private config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    console.log('🛡️ JWT Guard Check:', {
      hasAuthHeader: !!authHeader,
      tokenPreview: authHeader
        ? authHeader.substring(0, 50) + '...'
        : 'NO HEADER',
    });

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ No se proporcionó token Bearer');
      throw new UnauthorizedException(
        'No se proporcionó token de autenticación',
      );
    }

    const token = authHeader.substring(7);

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
        console.error('⚠️ No se encontró perfil para el usuario:', decoded.sub);
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
        '✅ Usuario autenticado via JWT:',
        decoded.email,
        'Rol:',
        request.user.rol,
      );
      return true;
    } catch (err: any) {
      console.error('❌ Error en autenticación:', err.message);
      throw new UnauthorizedException(
        err.message || 'Error al verificar autenticación',
      );
    }
  }
}
