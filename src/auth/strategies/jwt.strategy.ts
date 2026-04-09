// ================================================
// src/auth/strategies/jwt.strategy.ts
// ================================================
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../supabase/supabase.service';
import jwksClient from 'jwks-rsa';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private jwksClient: jwksClient.JwksClient;

  constructor(
    private configService: ConfigService,
    private supabase: SupabaseService,
  ) {
    const supabaseUrl = configService.get<string>('SUPABASE_URL');
    const jwtSecret = configService.get<string>('JWT_SECRET');

    if (!supabaseUrl) {
      throw new Error('Falta la variable SUPABASE_URL en el .env');
    }

    // Crear cliente JWKS para obtener claves públicas de Supabase
    const client = jwksClient({
      jwksUri: `${supabaseUrl}/rest/v1/.well-known/jwks.json`,
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: any) => {
          let token = null;
          if (req && req.cookies) {
            token = req.cookies['access_token'];
          }
          return token;
        },
      ]),
      // Usar secretOrKeyProvider con jwks-rsa
      secretOrKeyProvider: (
        request: any,
        rawJwtToken: string,
        done: (err: any, key?: string) => void,
      ) => {
        // Obtener el kid del header del token
        const header = JSON.parse(
          Buffer.from(rawJwtToken.split('.')[0], 'base64').toString(),
        );
        const kid = header.kid;

        if (!kid) {
          // Si no hay kid, intentar usar JWT_SECRET (para tokens HS256)
          if (jwtSecret) {
            return done(null, jwtSecret);
          }
          return done(
            new Error('Token sin kid y no hay JWT_SECRET configurado'),
          );
        }

        // Obtener clave del JWKS
        client.getSigningKey(kid, (err, key) => {
          if (err) {
            console.error('❌ Error al obtener clave del JWKS:', err.message);
            // Fallback a JWT_SECRET si está disponible
            if (jwtSecret) {
              return done(null, jwtSecret);
            }
            return done(err);
          }
          if (!key) {
            return done(new Error('No se encontró la clave de firma'));
          }
          const signingKey = key.getPublicKey();
          done(null, signingKey);
        });
      },
      algorithms: ['ES256', 'RS256', 'HS256'],
      ignoreExpiration: false,
    });

    this.jwksClient = client;
    console.log(
      '🔐 JWT Strategy inicializada con JWKS (soporta ES256/RS256/HS256)',
    );
  }

  async validate(payload: any) {
    console.log(
      '🔑 Validando JWT Payload:',
      payload.email,
      'sub:',
      payload.sub,
    );

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
          activo: true,
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
        rol: 'USUARIO',
      };
    }
  }
}
