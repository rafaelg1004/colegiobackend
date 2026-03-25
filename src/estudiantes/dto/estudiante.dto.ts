import {
  IsString, IsNotEmpty, IsOptional, IsIn, IsDateString, IsUUID, IsObject,
} from 'class-validator';

export class CreateEstudianteDto {
  @IsString() @IsNotEmpty()
  primer_nombre: string;

  @IsOptional() @IsString()
  segundo_nombre?: string;

  @IsString() @IsNotEmpty()
  primer_apellido: string;

  @IsOptional() @IsString()
  segundo_apellido?: string;

  @IsOptional() @IsIn(['TI', 'RC', 'CC', 'CE', 'Otro'])
  tipo_documento?: string;

  @IsString() @IsNotEmpty()
  numero_documento: string;

  @IsDateString()
  fecha_nacimiento: string;

  @IsOptional() @IsString()
  lugar_nacimiento?: string;

  @IsOptional() @IsIn(['M', 'F', 'Otro'])
  genero?: string;

  @IsOptional() @IsString()
  grupo_sanguineo?: string;

  @IsOptional() @IsString()
  direccion?: string;

  @IsOptional() @IsString()
  barrio?: string;

  @IsOptional() @IsString()
  municipio?: string;

  @IsOptional() @IsString()
  departamento?: string;

  @IsOptional() @IsString()
  eps?: string;

  @IsOptional() @IsString()
  alergias?: string;

  @IsOptional() @IsString()
  condicion_especial?: string;

  @IsOptional() @IsString()
  codigo_simat?: string;

  @IsOptional() @IsObject()
  configuracion_parental?: Record<string, any>;

  @IsOptional() @IsString()
  foto_perfil_url?: string;

  @IsOptional() @IsIn(['Activo', 'Inactivo', 'Retirado', 'Graduado', 'Trasladado'])
  estado?: string;
}

export class UpdateEstudianteDto {
  @IsOptional() @IsString()
  primer_nombre?: string;

  @IsOptional() @IsString()
  segundo_nombre?: string;

  @IsOptional() @IsString()
  primer_apellido?: string;

  @IsOptional() @IsString()
  segundo_apellido?: string;

  @IsOptional() @IsIn(['TI', 'RC', 'CC', 'CE', 'Otro'])
  tipo_documento?: string;

  @IsOptional() @IsString()
  numero_documento?: string;

  @IsOptional() @IsDateString()
  fecha_nacimiento?: string;

  @IsOptional() @IsString()
  lugar_nacimiento?: string;

  @IsOptional() @IsIn(['M', 'F', 'Otro'])
  genero?: string;

  @IsOptional() @IsString()
  grupo_sanguineo?: string;

  @IsOptional() @IsString()
  direccion?: string;

  @IsOptional() @IsString()
  barrio?: string;

  @IsOptional() @IsString()
  municipio?: string;

  @IsOptional() @IsString()
  departamento?: string;

  @IsOptional() @IsString()
  eps?: string;

  @IsOptional() @IsString()
  alergias?: string;

  @IsOptional() @IsString()
  condicion_especial?: string;

  @IsOptional() @IsString()
  codigo_simat?: string;

  @IsOptional() @IsObject()
  configuracion_parental?: Record<string, any>;

  @IsOptional() @IsIn(['Activo', 'Inactivo', 'Retirado', 'Graduado', 'Trasladado'])
  estado?: string;

  @IsOptional() @IsString()
  foto_perfil_url?: string;
}

export class QueryEstudianteDto {
  @IsOptional() @IsString()
  buscar?: string;

  @IsOptional() @IsIn(['Activo', 'Inactivo', 'Retirado', 'Graduado', 'Trasladado'])
  estado?: string;

  @IsOptional() @IsUUID()
  grupo_id?: string;

  @IsOptional() @IsUUID()
  grado_id?: string;

  @IsOptional() @IsString()
  page?: string;

  @IsOptional() @IsString()
  limit?: string;
}
