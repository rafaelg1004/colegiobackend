import { IsUUID, IsIn, IsOptional, IsString, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AsistenciaIndividualDto {
  @IsUUID()
  estudiante_id: string;

  @IsIn(['Presente', 'Ausente', 'Tardanza', 'Excusa'])
  estado: string;

  @IsOptional() @IsString()
  justificacion?: string;
}

export class RegistrarAsistenciaDto {
  @IsDateString()
  fecha: string;

  @IsUUID()
  grupo_id: string;

  @IsOptional() @IsUUID()
  asignatura_id?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AsistenciaIndividualDto)
  asistencias: AsistenciaIndividualDto[];
}

export class UpdateAsistenciaDto {
  @IsIn(['Presente', 'Ausente', 'Tardanza', 'Excusa'])
  estado: string;

  @IsOptional() @IsString()
  justificacion?: string;
}
