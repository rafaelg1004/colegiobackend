import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsUUID, Min, Max, IsArray } from 'class-validator';

export class CreateInstitucionDto {
  @IsString() @IsNotEmpty()
  nombre: string;

  @IsString() @IsNotEmpty()
  nit: string;

  @IsOptional() @IsString()
  direccion?: string;

  @IsOptional() @IsString()
  telefono?: string;

  @IsOptional() @IsString()
  correo_electronico?: string;

  @IsOptional() @IsString()
  logo_url?: string;

  @IsOptional() @IsString()
  rector?: string;

  @IsOptional() @IsString()
  resolucion_aprobacion?: string;

  @IsOptional() @IsString()
  dane?: string;

  @IsOptional() @IsArray()
  @IsString({ each: true })
  jornadas?: string[];
}

export class UpdateInstitucionDto {
  @IsOptional() @IsString()
  nombre?: string;

  @IsOptional() @IsString()
  direccion?: string;

  @IsOptional() @IsString()
  telefono?: string;

  @IsOptional() @IsString()
  correo_electronico?: string;

  @IsOptional() @IsString()
  logo_url?: string;

  @IsOptional() @IsString()
  rector?: string;

  @IsOptional() @IsString()
  resolucion_aprobacion?: string;

  @IsOptional() @IsString()
  dane?: string;

  @IsOptional() @IsArray()
  @IsString({ each: true })
  jornadas?: string[];
}

export class CreateNivelDto {
  @IsString() @IsNotEmpty()
  nombre: string;
}

export class CreateGradoDto {
  @IsString() @IsNotEmpty()
  nombre: string;

  @IsOptional() @IsString()
  codigo?: string;

  @IsNumber() @Min(1) @Max(11)
  orden: number;

  @IsUUID()
  nivel_id: string;
}

export class UpdateGradoDto {
  @IsOptional() @IsString()
  nombre?: string;

  @IsOptional() @IsString()
  codigo?: string;

  @IsOptional() @IsNumber()
  orden?: number;

  @IsOptional() @IsUUID()
  nivel_id?: string;
}

export class CreateTipoActividadDto {
  @IsString() @IsNotEmpty()
  nombre: string;
}

export class QueryGradoDto {
  @IsOptional() @IsString()
  nivel_id?: string;

  @IsOptional() @IsString()
  buscar?: string;
}