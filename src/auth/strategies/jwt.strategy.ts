// ================================================
// src/auth/strategies/jwt.strategy.ts
// ================================================
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private supabase: SupabaseService,
  ) {
    const supabaseUrl = configService.get<string>('SUPABASE_URL');
    const jwtSecret = configService.get<string>('JWT_SECRET');

    if (!supabaseUrl) {
      throw new Error('Falta la variable SUPABASE_URL en el .env');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req) => {
          let token = null;
          if (req && req.cookies) {
            token = req.cookies['access_token'];
          }
          return token;
        },
      ]),
      secretOrKey: jwtSecret || 'fallback-secret',
      algorithms: ['HS256', 'ES256'],
      ignoreExpiration: false,
    });

    console.log('🔐 JWT Strategy inicializada');
  }

  async validate(payload: any) {
    console.log('🔑 Validando JWT Payload:', payload.email, 'sub:', payload.sub);

    try {
      const { data: perfil, error } = await this.supabase.admin
        .from('perfil_usuario')
        .select('rol, empleado_id, acudiente_id, estudiante_id, activo')
        .eq('id', payload.sub)
        .single();

      if (error || !perfil) {
        console.warn('⚠️ No se encontró perfil en DB para:', payload.email);
        return {
          sub: payload.sub,
          email: payload.email,
          rol: 'INVITADO',
          activo: true
        };
      }

      if (perfil && perfil.activo === false) {
        throw new UnauthorizedException('Usuario inactivo');
      }

      return {
        sub: payload.sub,
        email: payload.email,
        rol: perfil.rol,
        empleado_id: perfil.empleado_id,
        acudiente_id: perfil.acudiente_id,
        estudiante_id: perfil.estudiante_id,
      };
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      console.error('💥 Error en validación:', err.message || err);
      return {
        sub: payload.sub,
        email: payload.email,
        rol: 'USUARIO'
      };
    }
  }
}
