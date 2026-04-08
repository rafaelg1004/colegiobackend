import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsUUID, Min, Max } from 'class-validator';

export class CreateCuentaContableDto {
  @IsString() @IsNotEmpty()
  codigo: string;

  @IsString() @IsNotEmpty()
  nombre: string;

  @IsString() @IsNotEmpty()
  tipo: string;

  @IsString() @IsNotEmpty()
  naturaleza: string;

  @IsOptional() @IsUUID()
  padre_id?: string;
}

export class UpdateCuentaContableDto {
  @IsOptional() @IsString()
  codigo?: string;

  @IsOptional() @IsString()
  nombre?: string;

  @IsOptional() @IsString()
  tipo?: string;

  @IsOptional() @IsString()
  naturaleza?: string;

  @IsOptional() @IsUUID()
  padre_id?: string;
}

export class CreateMovimientoContableDto {
  @IsOptional() @IsString()
  descripcion?: string;

  @IsOptional() @IsString()
  fecha?: string;

  @IsOptional() @IsNumber()
  @Min(0)
  debe?: number;

  @IsOptional() @IsNumber()
  @Min(0)
  haber?: number;

  @IsUUID()
  cuenta_contable_id: string;

  @IsOptional() @IsUUID()
  factura_id?: string;

  @IsOptional() @IsUUID()
  pago_id?: string;

  @IsOptional() @IsUUID()
  nomina_id?: string;
}

export class QueryCuentaContableDto {
  @IsOptional() @IsString()
  tipo?: string;

  @IsOptional() @IsString()
  naturaleza?: string;

  @IsOptional() @IsString()
  buscar?: string;
}

export class QueryMovimientoContableDto {
  @IsOptional() @IsString()
  cuenta_contable_id?: string;

  @IsOptional() @IsString()
  factura_id?: string;

  @IsOptional() @IsString()
  pago_id?: string;

  @IsOptional() @IsString()
  nomina_id?: string;

  @IsOptional() @IsString()
  fecha_desde?: string;

  @IsOptional() @IsString()
  fecha_hasta?: string;
}