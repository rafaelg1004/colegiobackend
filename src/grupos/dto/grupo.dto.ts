import { IsString, IsNotEmpty, IsOptional, IsUUID, IsInt, Min } from 'class-validator';

export class CreateGrupoDto {
  @IsString() @IsNotEmpty()
  nombre: string;

  @IsOptional() @IsString()
  jornada?: string;

  @IsOptional() @IsInt() @Min(1)
  cupo_maximo?: number;

  @IsUUID()
  grado_id: string;

  @IsUUID()
  anio_lectivo_id: string;

  @IsOptional() @IsUUID()
  sede_id?: string;
}
