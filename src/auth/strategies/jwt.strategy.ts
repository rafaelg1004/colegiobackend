// ================================================
// src/auth/strategies/jwt.strategy.ts
// ================================================
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../supabase/supabase.service';
import * as jose from 'jose';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private jwks: jose.JWTVerifyGetKey | null = null;
  private jwksUri: string;

  constructor(
    configService: ConfigService,
    private supabase: SupabaseService,
  ) {
    const supabaseUrl = configService.get<string>('SUPABASE_URL');
    if (!supabaseUrl) {
      throw new Error('Falta la variable SUPABASE_URL en el .env');
    }

    this.jwksUri = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;
    console.log('🔐 JWT Strategy inicializada con JWKS:', this.jwksUri);

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
      secretOrKeyProvider: async (req, rawToken, done) => {
        try {
          // Obtener las claves JWKS
          const JWKS = jose.createRemoteJWKSet(new URL(this.jwksUri));

          // Verificar el token
          const { payload } = await jose.jwtVerify(rawToken, JWKS, {
            algorithms: ['ES256'],
          });

          done(null, payload);
        } catch (err) {
          done(err, null);
        }
      },
      algorithms: ['ES256'],
      ignoreExpiration: false,
    });
  }

  async validate(payload: any) {
    console.log('🔑 Validando JWT Payload:', payload.email, 'sub:', payload.sub);

    // Debug: mostrar todo el payload
    console.log('🔑 JWT Full payload:', JSON.stringify(payload));

    try {
      // Intentamos obtener el perfil, pero no dejamos que un error aquí bloquee al usuario
      // si el token JWT ya es válido por sí mismo.
      const { data: perfil, error } = await this.supabase.admin
        .from('perfil_usuario')
        .select('rol, empleado_id, acudiente_id, estudiante_id, activo')
        .eq('id', payload.sub)
        .single();

      if (error || !perfil) {
        console.warn('⚠️ No se encontró perfil en DB para:', payload.email, 'usando datos de emergencia');
        return {
          sub: payload.sub,
          email: payload.email,
          rol: 'INVITADO', // Rol por defecto si falla la DB
          activo: true
        };
      }

      if (perfil && perfil.activo === false) {
        console.error('🚫 Usuario desactivado explícitamente:', payload.email);
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
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;

      // Fallback: si falla Supabase, pero el JWT es válido, dejamos pasar con info básica
      console.error('💥 Error en validación de perfil (Fallback activo):', err.message);
      return {
        sub: payload.sub,
        email: payload.email,
        rol: 'USUARIO'
      };
    }
  }
}
