// ================================================
// src/auth/guards/jwt-auth.guard.ts
// ================================================
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private supabase: SupabaseService) {}

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
      // Verificar token usando Supabase Auth API
      const {
        data: { user },
        error,
      } = await this.supabase.admin.auth.getUser(token);

      if (error || !user) {
        console.error('❌ Token inválido según Supabase:', error?.message);
        throw new UnauthorizedException('Token inválido o expirado');
      }

      // Obtener perfil del usuario
      const { data: perfil, error: perfilError } = await this.supabase.admin
        .from('perfil_usuario')
        .select('rol, empleado_id, acudiente_id, estudiante_id, activo')
        .eq('id', user.id)
        .single();

      if (perfilError) {
        console.warn('⚠️ No se encontró perfil, usando datos básicos');
      }

      // Adjuntar usuario al request
      request.user = {
        sub: user.id,
        email: user.email,
        rol: perfil?.rol || 'USUARIO',
        empleado_id: perfil?.empleado_id,
        acudiente_id: perfil?.acudiente_id,
        estudiante_id: perfil?.estudiante_id,
        activo: perfil?.activo ?? true,
      };

      console.log(
        '✅ Usuario autenticado:',
        request.user.email,
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
