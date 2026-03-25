// ================================================
// src/auth/dto/auth.dto.ts
// ================================================
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsIn,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Correo electrónico inválido' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener mínimo 6 caracteres' })
  password: string;

  @IsIn([
    'admin',
    'rector',
    'coordinador',
    'docente',
    'secretaria',
    'acudiente',
    'estudiante',
  ])
  rol: string;

  @IsOptional()
  @IsUUID()
  empleado_id?: string;

  @IsOptional()
  @IsUUID()
  acudiente_id?: string;

  @IsOptional()
  @IsUUID()
  estudiante_id?: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Correo electrónico inválido' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  password: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  new_password: string;
}
