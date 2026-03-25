import { IsString, IsNotEmpty, IsOptional, IsIn, IsEmail } from 'class-validator';

export class CreateAcudienteDto {
  @IsString() @IsNotEmpty()
  primer_nombre: string;

  @IsString() @IsNotEmpty()
  primer_apellido: string;

  @IsIn(['CC', 'CE', 'NIT', 'Pasaporte', 'Otro'])
  tipo_documento: string;

  @IsString() @IsNotEmpty()
  numero_documento: string;

  @IsOptional() @IsString()
  parentesco?: string;

  @IsOptional() @IsString()
  telefono?: string;

  @IsOptional() @IsString()
  celular?: string;

  @IsOptional() @IsEmail()
  correo_electronico?: string;

  @IsOptional() @IsString()
  direccion?: string;

  @IsOptional() @IsString()
  ocupacion?: string;

  @IsOptional() @IsString()
  empresa?: string;
}

export class UpdateAcudienteDto {
  @IsOptional() @IsString()
  primer_nombre?: string;

  @IsOptional() @IsString()
  primer_apellido?: string;

  @IsOptional() @IsString()
  celular?: string;

  @IsOptional() @IsEmail()
  correo_electronico?: string;

  @IsOptional() @IsString()
  direccion?: string;

  @IsOptional() @IsString()
  ocupacion?: string;

  @IsOptional() @IsString()
  empresa?: string;
}
