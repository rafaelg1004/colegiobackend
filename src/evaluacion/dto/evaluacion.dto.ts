import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsUUID, IsDateString, Min, Max } from 'class-validator';

export class CreateActividadEvaluativaDto {
  @IsString() @IsNotEmpty()
  nombre: string;

  @IsOptional() @IsString()
  descripcion?: string;

  @IsOptional() @IsNumber()
  @Min(0) @Max(100)
  porcentaje_peso?: number;

  @IsOptional() @IsDateString()
  fecha?: string;

  @IsUUID()
  tipo_actividad_id: string;

  @IsUUID()
  asignatura_id: string;

  @IsUUID()
  grupo_id: string;

  @IsUUID()
  periodo_academico_id: string;
}

export class UpdateActividadEvaluativaDto {
  @IsOptional() @IsString()
  nombre?: string;

  @IsOptional() @IsString()
  descripcion?: string;

  @IsOptional() @IsNumber()
  @Min(0) @Max(100)
  porcentaje_peso?: number;

  @IsOptional() @IsDateString()
  fecha?: string;

  @IsOptional() @IsUUID()
  tipo_actividad_id?: string;

  @IsOptional() @IsUUID()
  asignatura_id?: string;

  @IsOptional() @IsUUID()
  grupo_id?: string;

  @IsOptional() @IsUUID()
  periodo_academico_id?: string;
}

export class CreateBloqueHorarioDto {
  @IsString() @IsNotEmpty()
  dia_semana: string;

  @IsString() @IsNotEmpty()
  hora_inicio: string;

  @IsString() @IsNotEmpty()
  hora_fin: string;

  @IsOptional() @IsUUID()
  asignacion_docente_id?: string;

  @IsOptional() @IsString()
  aula?: string;

  @IsUUID()
  anio_lectivo_id: string;
}

export class UpdateBloqueHorarioDto {
  @IsOptional() @IsString()
  dia_semana?: string;

  @IsOptional() @IsString()
  hora_inicio?: string;

  @IsOptional() @IsString()
  hora_fin?: string;

  @IsOptional() @IsUUID()
  asignacion_docente_id?: string;

  @IsOptional() @IsString()
  aula?: string;
}

export class CreateNotaPeriodoDto {
  @IsOptional() @IsNumber()
  @Min(0) @Max(5)
  nota_final?: number;

  @IsOptional() @IsString()
  desempeno?: string;

  @IsOptional() @IsString()
  observacion_docente?: string;

  @IsUUID()
  estudiante_id: string;

  @IsUUID()
  asignatura_id: string;

  @IsUUID()
  periodo_academico_id: string;
}

export class UpdateNotaPeriodoDto {
  @IsOptional() @IsNumber()
  @Min(0) @Max(5)
  nota_final?: number;

  @IsOptional() @IsString()
  desempeno?: string;

  @IsOptional() @IsString()
  observacion_docente?: string;
}

export class QueryActividadDto {
  @IsOptional() @IsString()
  grupo_id?: string;

  @IsOptional() @IsString()
  asignatura_id?: string;

  @IsOptional() @IsString()
  periodo_id?: string;

  @IsOptional() @IsString()
  tipo_actividad_id?: string;
}

export class QueryBloqueHorarioDto {
  @IsOptional() @IsString()
  anio_lectivo_id?: string;

  @IsOptional() @IsString()
  dia_semana?: string;

  @IsOptional() @IsString()
  grupo_id?: string;
}

export class QueryNotaPeriodoDto {
  @IsOptional() @IsString()
  estudiante_id?: string;

  @IsOptional() @IsString()
  asignatura_id?: string;

  @IsOptional() @IsString()
  periodo_id?: string;
}