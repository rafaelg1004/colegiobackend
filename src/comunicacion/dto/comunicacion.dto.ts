import { IsString, IsNotEmpty, IsOptional, IsUUID, IsIn } from 'class-validator';

export class CreateCircularDto {
  @IsString() @IsNotEmpty()
  titulo: string;

  @IsString() @IsNotEmpty()
  contenido: string;

  @IsIn(['Todos', 'Acudientes', 'Docentes', 'Estudiantes', 'Grupo especifico'])
  dirigida_a: string;

  @IsOptional() @IsUUID()
  grupo_id?: string;

  @IsOptional() @IsString()
  archivo_adjunto_url?: string;
}
