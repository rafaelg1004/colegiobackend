import { IsUUID, IsNumber, IsOptional, IsString, Min, Max, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateActividadDto {
  @IsString()
  nombre: string;

  @IsOptional() @IsString()
  descripcion?: string;

  @IsOptional() @IsNumber()
  porcentaje_peso?: number;

  @IsOptional() @IsDateString()
  fecha?: string;

  @IsOptional() @IsUUID()
  tipo_actividad_id?: string;

  @IsUUID()
  asignatura_id: string;

  @IsUUID()
  grupo_id: string;

  @IsUUID()
  periodo_academico_id: string;
}

export class CalificacionIndividualDto {
  @IsUUID()
  estudiante_id: string;

  @IsNumber() @Min(0) @Max(5)
  nota: number;

  @IsOptional() @IsString()
  observacion?: string;
}

export class RegistrarNotasDto {
  @IsUUID()
  actividad_evaluativa_id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CalificacionIndividualDto)
  calificaciones: CalificacionIndividualDto[];
}

export class UpdateNotaDto {
  @IsNumber() @Min(0) @Max(5)
  nota: number;

  @IsOptional() @IsString()
  observacion?: string;
}
