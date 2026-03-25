import {
  IsString, IsNotEmpty, IsOptional, IsUUID, IsNumber, IsInt, IsIn, Min,
} from 'class-validator';

export class CreateArticuloDto {
  @IsString() @IsNotEmpty()
  nombre: string;

  @IsOptional() @IsString()
  descripcion?: string;

  @IsOptional() @IsString()
  codigo_interno?: string;

  @IsOptional() @IsInt() @Min(0)
  cantidad_stock?: number;

  @IsOptional() @IsInt() @Min(0)
  cantidad_minima?: number;

  @IsOptional() @IsString()
  unidad_medida?: string;

  @IsOptional() @IsNumber() @Min(0)
  precio_unitario?: number;

  @IsOptional() @IsString()
  ubicacion?: string;

  @IsOptional() @IsUUID()
  categoria_id?: string;
}

export class UpdateArticuloDto {
  @IsOptional() @IsString()
  nombre?: string;

  @IsOptional() @IsString()
  descripcion?: string;

  @IsOptional() @IsInt() @Min(0)
  cantidad_minima?: number;

  @IsOptional() @IsNumber() @Min(0)
  precio_unitario?: number;

  @IsOptional() @IsString()
  ubicacion?: string;

  @IsOptional() @IsUUID()
  categoria_id?: string;

  @IsOptional() @IsIn(['Disponible', 'Agotado', 'Dado de baja'])
  estado?: string;
}

export class CreateMovimientoDto {
  @IsUUID()
  articulo_id: string;

  @IsIn(['Entrada', 'Salida', 'Ajuste', 'Baja'])
  tipo: string;

  @IsInt() @Min(1)
  cantidad: number;

  @IsOptional() @IsString()
  motivo?: string;
}

export class CreateEspacioDto {
  @IsString() @IsNotEmpty()
  nombre: string;

  @IsOptional() @IsString()
  tipo?: string;

  @IsOptional() @IsInt() @Min(1)
  capacidad?: number;

  @IsOptional() @IsUUID()
  sede_id?: string;
}
