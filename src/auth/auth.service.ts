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
    return null;
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
    // Get perfil_usuario data
    let puQuery = this.database.admin
      .from('perfil_usuario')
      .select('id, rol, activo, created_at, empleado_id, acudiente_id, estudiante_id')
      .order('created_at', { ascending: false });
    if (rol) puQuery = puQuery.eq('rol', rol);
    
    const { data: perfiles, error: puError } = await puQuery;
    if (puError) throw new BadRequestException(puError.message);
    if (!perfiles || perfiles.length === 0) return [];

    const ids = perfiles.map((p: any) => p.id);

    // Get emails from users table
    const { data: usersData } = await this.database.admin
      .from('users')
      .select('id, email')
      .in('id', ids);
    const emailMap = new Map((usersData || []).map((u: any) => [u.id, u.email]));

    // Get empleado data (singular table name)
    const empleadoIds = perfiles.filter((p: any) => p.empleado_id).map((p: any) => p.empleado_id);
    let empleadosMap = new Map();
    if (empleadoIds.length > 0) {
      const { data: empleados } = await this.database.admin
        .from('empleado')
        .select('id, primer_nombre, primer_apellido, cargo')
        .in('id', empleadoIds);
      empleadosMap = new Map((empleados || []).map((e: any) => [e.id, e]));
    }

    // Get acudientes data  
    const acudienteIds = perfiles.filter((p: any) => p.acudiente_id).map((p: any) => p.acudiente_id);
    let acudientesMap = new Map();
    if (acudienteIds.length > 0) {
      const { data: acudientes } = await this.database.admin
        .from('acudientes')
        .select('id, primer_nombre, primer_apellido')
        .in('id', acudienteIds);
      acudientesMap = new Map((acudientes || []).map((a: any) => [a.id, a]));
    }

    // Get estudiantes data
    const estudianteIds = perfiles.filter((p: any) => p.estudiante_id).map((p: any) => p.estudiante_id);
    let estudiantesMap = new Map();
    if (estudianteIds.length > 0) {
      const { data: estudiantes } = await this.database.admin
        .from('estudiantes')
        .select('id, primer_nombre, primer_apellido, numero_documento')
        .in('id', estudianteIds);
      estudiantesMap = new Map((estudiantes || []).map((e: any) => [e.id, e]));
    }

    // Combine all data
    return perfiles.map((p: any) => {
      const empleado = p.empleado_id ? empleadosMap.get(p.empleado_id) : undefined;
      const acudiente = p.acudiente_id ? acudientesMap.get(p.acudiente_id) : undefined;
      const estudiante = p.estudiante_id ? estudiantesMap.get(p.estudiante_id) : undefined;

      return {
        id: p.id,
        rol: p.rol,
        activo: p.activo,
        created_at: p.created_at,
        email: emailMap.get(p.id) || null,
        empleado: empleado ? {
          primer_nombre: empleado.primer_nombre,
          primer_apellido: empleado.primer_apellido,
          cargo: empleado.cargo
        } : undefined,
        acudiente: acudiente ? {
          primer_nombre: acudiente.primer_nombre,
          primer_apellido: acudiente.primer_apellido
        } : undefined,
        estudiante: estudiante ? {
          primer_nombre: estudiante.primer_nombre,
          primer_apellido: estudiante.primer_apellido,
          numero_documento: estudiante.numero_documento
        } : undefined
      };
    });
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
