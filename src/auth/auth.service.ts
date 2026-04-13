// ================================================
// src/auth/auth.service.ts
// Autenticación local con PostgreSQL
// ================================================
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  constructor(
    private database: DatabaseService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const { email, password, rol, empleado_id, acudiente_id, estudiante_id } =
      dto;

    // 1. Verificar si el email ya existe
    const { data: existingUser } = await this.database.admin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      throw new ConflictException('Ya existe un usuario con este correo');
    }

    // 2. Generar ID y hashear password
    const userId = crypto.randomUUID();
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Crear usuario en tabla local users
    const { error: userError } = await this.database.admin
      .from('users')
      .insert({
        id: userId,
        email,
        password_hash: hashedPassword,
        created_at: new Date().toISOString(),
      });

    if (userError) {
      throw new BadRequestException(
        'Error al crear usuario: ' + userError.message,
      );
    }

    // 4. Crear perfil_usuario vinculando el user con su rol
    const { error: perfilError } = await this.database.admin
      .from('perfil_usuario')
      .insert({
        id: userId,
        rol,
        empleado_id: empleado_id || null,
        acudiente_id: acudiente_id || null,
        estudiante_id: estudiante_id || null,
      });

    if (perfilError) {
      // Si falla el perfil, eliminar el usuario creado
      await this.database.admin.from('users').delete().eq('id', userId);
      throw new BadRequestException(
        'Error al crear perfil: ' + perfilError.message,
      );
    }

    return {
      message: 'Usuario registrado exitosamente',
      user: {
        id: userId,
        email,
        rol,
      },
    };
  }

  async login(dto: LoginDto) {
    console.log('🔐 Login intento:', dto.email);

    // 1. Buscar usuario por email
    const { data: user, error: userError } = await this.database.admin
      .from('users')
      .select('id, email, password_hash')
      .eq('email', dto.email)
      .single();

    console.log('👤 Usuario encontrado:', !!user, 'Error:', userError?.message);
    if (user) {
      console.log('   ID:', user.id);
      console.log('   Hash length:', user.password_hash?.length);
      console.log('   Hash starts with:', user.password_hash?.substring(0, 10));
    }

    if (userError || !user) {
      console.log('❌ Usuario no encontrado o error');
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // 2. Verificar password
    console.log('🔑 Verificando password...');
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.password_hash,
    );
    console.log('✅ Password válido:', isPasswordValid);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // 3. Obtener el perfil con el rol
    const { data: perfil, error: perfilError } = await this.database.admin
      .from('perfil_usuario')
      .select('rol, empleado_id, acudiente_id, estudiante_id, activo')
      .eq('id', user.id)
      .single();

    if (perfilError || !perfil) {
      throw new UnauthorizedException('Perfil no encontrado');
    }

    if (!perfil.activo) {
      throw new UnauthorizedException(
        'Usuario desactivado. Contacte al administrador.',
      );
    }

    // 4. Generar tokens JWT localmente
    const accessToken = this.generateJwt(user.id, user.email, perfil.rol);
    const refreshToken = this.generateRefreshToken(user.id);

    return {
      message: 'Inicio de sesión exitoso',
      session: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 horas
      },
      user: {
        id: user.id,
        email: user.email,
        rol: perfil.rol,
        empleado_id: perfil.empleado_id,
        acudiente_id: perfil.acudiente_id,
        estudiante_id: perfil.estudiante_id,
      },
    };
  }

  private generateJwt(userId: string, email: string, rol: string): string {
    const secret = this.config.get<string>('JWT_SECRET') || 'fallback-secret';
    return jwt.sign(
      {
        sub: userId,
        email,
        rol,
      },
      secret,
      { expiresIn: '24h' },
    );
  }

  private generateRefreshToken(userId: string): string {
    return crypto.randomBytes(40).toString('hex');
  }

  async refreshToken(refresh_token: string) {
    // Con autenticación local, generamos nuevos tokens
    // En producción, podrías verificar el refresh token en una tabla
    const userId = this.extractUserIdFromRefreshToken(refresh_token);
    if (!userId) {
      throw new UnauthorizedException('Token de refresco inválido');
    }

    const { data: user } = await this.database.admin
      .from('users')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const { data: perfil } = await this.database.admin
      .from('perfil_usuario')
      .select('rol')
      .eq('id', userId)
      .single();

    const newAccessToken = this.generateJwt(
      user.id,
      user.email,
      perfil?.rol || 'USUARIO',
    );
    const newRefreshToken = this.generateRefreshToken(user.id);

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
    };
  }

  private extractUserIdFromRefreshToken(token: string): string | null {
    // Simplificado - en producción verificarías en una tabla de refresh tokens
    return null; // Implementar según necesidades
  }

  async getProfile(userId: string) {
    const { data, error } = await this.database.admin
      .from('perfil_usuario')
      .select(
        `
        id, rol, activo,
        empleado:empleado_id (id, primer_nombre, primer_apellido, cargo, correo_electronico),
        acudiente:acudiente_id (id, primer_nombre, primer_apellido, correo_electronico),
        estudiante:estudiante_id (id, primer_nombre, primer_apellido, numero_documento)
      `,
      )
      .eq('id', userId)
      .single();

    if (error) throw new BadRequestException('Perfil no encontrado');
    return data;
  }

  async changePassword(userId: string, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const { error } = await this.database.admin
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('id', userId);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Contraseña actualizada exitosamente' };
  }

  async listUsers(rol?: string) {
    let query = this.database.admin
      .from('perfil_usuario')
      .select(
        `
        id, rol, activo, created_at,
        empleado:empleado_id (primer_nombre, primer_apellido, cargo),
        acudiente:acudiente_id (primer_nombre, primer_apellido),
        estudiante:estudiante_id (primer_nombre, primer_apellido)
      `,
      )
      .order('created_at', { ascending: false });

    if (rol) query = query.eq('rol', rol);

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async toggleUserActive(userId: string, activo: boolean) {
    const { error } = await this.database.admin
      .from('perfil_usuario')
      .update({ activo })
      .eq('id', userId);

    if (error) throw new BadRequestException(error.message);
    return { message: activo ? 'Usuario activado' : 'Usuario desactivado' };
  }
}
