// ================================================
// src/auth/auth.service.ts
// ================================================
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(private supabase: SupabaseService) {}

  async register(dto: RegisterDto) {
    const { email, password, rol, empleado_id, acudiente_id, estudiante_id } =
      dto;

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } =
      await this.supabase.admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Confirma el email automáticamente
      });

    if (authError) {
      if (authError.message.includes('already')) {
        throw new ConflictException('Ya existe un usuario con este correo');
      }
      throw new BadRequestException(authError.message);
    }

    // 2. Crear perfil_usuario vinculando el auth.user con su rol
    const { error: perfilError } = await this.supabase.admin
      .from('perfil_usuario')
      .insert({
        id: authData.user.id,
        rol,
        empleado_id: empleado_id || null,
        acudiente_id: acudiente_id || null,
        estudiante_id: estudiante_id || null,
      });

    if (perfilError) {
      // Si falla el perfil, eliminar el usuario creado
      await this.supabase.admin.auth.admin.deleteUser(authData.user.id);
      throw new BadRequestException(
        'Error al crear perfil: ' + perfilError.message,
      );
    }

    return {
      message: 'Usuario registrado exitosamente',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        rol,
      },
    };
  }

  async login(dto: LoginDto) {
    const { data, error } = await this.supabase.admin.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error || !data.session) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // Obtener el perfil con el rol
    const { data: perfil } = await this.supabase.admin
      .from('perfil_usuario')
      .select('rol, empleado_id, acudiente_id, estudiante_id, activo')
      .eq('id', data.user.id)
      .single();

    if (!perfil?.activo) {
      throw new UnauthorizedException(
        'Usuario desactivado. Contacte al administrador.',
      );
    }

    return {
      message: 'Inicio de sesión exitoso',
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
      user: {
        id: data.user.id,
        email: data.user.email,
        rol: perfil.rol,
        empleado_id: perfil.empleado_id,
        acudiente_id: perfil.acudiente_id,
        estudiante_id: perfil.estudiante_id,
      },
    };
  }

  async refreshToken(refresh_token: string) {
    const { data, error } = await this.supabase.admin.auth.refreshSession({
      refresh_token,
    });

    if (error || !data.session) {
      throw new UnauthorizedException('Token de refresco inválido');
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    };
  }

  async getProfile(userId: string) {
    const { data, error } = await this.supabase.admin
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
    const { error } = await this.supabase.admin.auth.admin.updateUserById(
      userId,
      {
        password: newPassword,
      },
    );

    if (error) throw new BadRequestException(error.message);
    return { message: 'Contraseña actualizada exitosamente' };
  }

  async listUsers(rol?: string) {
    let query = this.supabase.admin
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
    const { error } = await this.supabase.admin
      .from('perfil_usuario')
      .update({ activo })
      .eq('id', userId);

    if (error) throw new BadRequestException(error.message);
    return { message: activo ? 'Usuario activado' : 'Usuario desactivado' };
  }
}
