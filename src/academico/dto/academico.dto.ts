import { IsString, IsNotEmpty, IsOptional, IsUUID, IsNumber, IsBoolean, Min, Max, IsDateString } from 'class-validator';

export class CreateSedeDto {
  @IsString() @IsNotEmpty()
  nombre: string;

  @IsOptional() @IsString()
  direccion?: string;

  @IsOptional() @IsString()
  telefono?: string;
}

export class CreateAnioLectivoDto {
  @IsNumber() @Min(2000) @Max(2100)
  anio: number;

  @IsDateString()
  fecha_inicio: string;

  @IsDateString()
  fecha_fin: string;

  @IsOptional() @IsBoolean()
  activo?: boolean;
}

export class CreatePeriodoDto {
  @IsString() @IsNotEmpty()
  nombre: string;

  @IsNumber() @Min(1) @Max(5)
  numero: number;

  @IsNumber() @Min(0) @Max(100)
  porcentaje_peso: number;

  @IsUUID()
  anio_lectivo_id: string;

  @IsDateString()
  fecha_inicio: string;

  @IsDateString()
  fecha_fin: string;
}

export class CreateAreaDto {
  @IsString() @IsNotEmpty()
  nombre: string;
}

export class CreateAsignaturaDto {
  @IsString() @IsNotEmpty()
  nombre: string;

  @IsUUID()
  area_id: string;
}

export class CreateAsignacionDocenteDto {
  @IsUUID()
  empleado_id: string;

  @IsUUID()
  asignatura_id: string;

  @IsUUID()
  grupo_id: string;

  @IsOptional() @IsBoolean()
  es_director_grupo?: boolean;
}
