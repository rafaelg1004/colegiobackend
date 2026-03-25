import { IsString, IsNotEmpty, IsOptional, IsUUID, IsIn, IsDateString, IsBoolean } from 'class-validator';

export class CreateObservacionDto {
  @IsUUID()
  estudiante_id: string;

  @IsIn(['Positiva', 'Negativa', 'Informativa', 'Compromiso'])
  tipo: string;

  @IsString() @IsNotEmpty()
  descripcion: string;

  @IsOptional() @IsString()
  compromiso?: string;

  @IsOptional() @IsDateString()
  fecha?: string;
}

export class UpdateObservacionDto {
  @IsOptional() @IsIn(['Positiva', 'Negativa', 'Informativa', 'Compromiso'])
  tipo?: string;

  @IsOptional() @IsString()
  descripcion?: string;

  @IsOptional() @IsString()
  compromiso?: string;

  @IsOptional() @IsBoolean()
  firma_acudiente?: boolean;
}
