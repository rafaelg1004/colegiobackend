import { IsUUID, IsOptional, IsString, IsNumber } from 'class-validator';

export class GenerarBoletinDto {
  @IsUUID()
  estudiante_id: string;

  @IsUUID()
  periodo_id: string;

  @IsOptional() @IsUUID()
  anio_lectivo_id?: string;
}

export class GenerarReporteGrupoDto {
  @IsUUID()
  grupo_id: string;

  @IsUUID()
  periodo_id: string;
}

export class FiltroReporteFinancieroDto {
  @IsOptional() @IsString()
  fecha_inicio?: string;

  @IsOptional() @IsString()
  fecha_fin?: string;

  @IsOptional() @IsUUID()
  sede_id?: string;
}
