import { IsUUID, IsOptional, IsIn, IsString } from 'class-validator';

export class CreateMatriculaDto {
  @IsUUID()
  estudiante_id: string;

  @IsUUID()
  grupo_id: string;

  @IsUUID()
  anio_lectivo_id: string;

  @IsOptional() @IsString()
  observaciones?: string;
}

export class UpdateMatriculaDto {
  @IsOptional() @IsUUID()
  grupo_id?: string;

  @IsOptional() @IsIn(['Activa', 'Cancelada', 'Pendiente'])
  estado?: string;

  @IsOptional() @IsString()
  observaciones?: string;
}
