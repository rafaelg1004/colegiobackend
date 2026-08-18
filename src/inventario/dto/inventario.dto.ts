import {
  IsString, IsNotEmpty, IsOptional, IsUUID, IsNumber, IsInt, IsIn, Min, IsBoolean, ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateArticuloDto {
  @IsString() @IsNotEmpty()
  nombre: string;

  @IsOptional() @IsString()
  descripcion?: string;

  @IsOptional() @IsString()
  codigo_interno?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cantidad_stock?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cantidad_minima?: number;

  @IsOptional() @IsString()
  unidad_medida?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio_unitario?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio_venta?: number;

  @IsOptional()
  @IsBoolean()
  es_servicio?: boolean;

  @IsOptional() @IsString()
  ubicacion?: string;

  @IsOptional()
  @ValidateIf((o, v) => v !== '' && v !== null && v !== undefined)
  @IsUUID()
  categoria_id?: string;
}

export class UpdateArticuloDto {
  @IsOptional() @IsString()
  nombre?: string;

  @IsOptional() @IsString()
  descripcion?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cantidad_minima?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio_unitario?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio_venta?: number;

  @IsOptional()
  @IsBoolean()
  es_servicio?: boolean;

  @IsOptional() @IsString()
  ubicacion?: string;

  @IsOptional()
  @ValidateIf((o, v) => v !== '' && v !== null && v !== undefined)
  @IsUUID()
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
