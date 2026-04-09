// ================================================
// src/auth/guards/supabase-auth.guard.ts
// ================================================
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Extraer token del header o cookie
    let token = this.extractToken(request);
    
    if (!token) {
      console.log('🚫 No se encontró token en la petición');
      throw new UnauthorizedException('No se proporcionó token de autenticación');
    }

    try {
      // Verificar token usando Supabase
      const { data: { user }, error } = await this.supabase.admin.auth.getUser(token);
      
      if (error || !user) {
        console.log('❌ Token inválido según Supabase:', error?.message);
        throw new UnauthorizedException('Token inválido o expirado');
      }

      // Obtener perfil del usuario
      const { data: perfil, error: perfilError } = await this.supabase.admin
        .from('perfil_usuario')
        .select('rol, empleado_id, acudiente_id, estudiante_id, activo')
        .eq('id', user.id)
        .single();

      if (perfilError) {
        console.log('⚠️ No se encontró perfil, usando datos básicos de auth');
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

      console.log('✅ Usuario autenticado:', request.user.email, 'Rol:', request.user.rol);
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
