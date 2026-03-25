import {
  IsString, IsNotEmpty, IsOptional, IsUUID, IsNumber, IsBoolean,
  IsIn, IsArray, ValidateNested, IsDateString, Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// --- Conceptos de cobro ---
export class CreateConceptoDto {
  @IsString() @IsNotEmpty()
  nombre: string;

  @IsNumber() @Min(0)
  valor: number;

  @IsOptional() @IsIn(['Única', 'Mensual', 'Anual', 'Semestral'])
  periodicidad?: string;

  @IsOptional() @IsBoolean()
  aplica_iva?: boolean;

  @IsOptional() @IsNumber()
  porcentaje_iva?: number;

  @IsOptional() @IsUUID()
  cuenta_contable_id?: string;
}

export class UpdateConceptoDto {
  @IsOptional() @IsString()
  nombre?: string;

  @IsOptional() @IsNumber() @Min(0)
  valor?: number;

  @IsOptional() @IsIn(['Única', 'Mensual', 'Anual', 'Semestral'])
  periodicidad?: string;

  @IsOptional() @IsBoolean()
  aplica_iva?: boolean;

  @IsOptional() @IsNumber()
  porcentaje_iva?: number;

  @IsOptional() @IsBoolean()
  activo?: boolean;
}

// --- Descuentos ---
export class CreateDescuentoDto {
  @IsString() @IsNotEmpty()
  nombre: string;

  @IsIn(['Porcentaje', 'Valor Fijo'])
  tipo: string;

  @IsNumber() @Min(0)
  valor: number;
}

// --- Factura ---
export class DetalleFacturaDto {
  @IsUUID()
  concepto_cobro_id: string;

  @IsOptional() @IsNumber() @Min(1)
  cantidad?: number;

  @IsOptional() @IsUUID()
  descuento_id?: string;

  @IsOptional() @IsString()
  descripcion?: string;
}

export class CreateFacturaDto {
  @IsUUID()
  acudiente_id: string;

  @IsOptional() @IsUUID()
  estudiante_id?: string;

  @IsOptional() @IsUUID()
  anio_lectivo_id?: string;

  @IsOptional() @IsDateString()
  fecha_vencimiento?: string;

  @IsOptional() @IsString()
  prefijo?: string;

  @IsOptional() @IsString()
  observaciones?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleFacturaDto)
  detalles: DetalleFacturaDto[];
}

// --- Facturación masiva (pensiones mensuales) ---
export class FacturacionMasivaDto {
  @IsUUID()
  concepto_cobro_id: string;

  @IsOptional() @IsUUID()
  anio_lectivo_id?: string;

  @IsOptional() @IsUUID()
  grupo_id?: string;

  @IsDateString()
  fecha_vencimiento: string;

  @IsOptional() @IsString()
  prefijo?: string;
}

// --- Pagos ---
export class CreatePagoDto {
  @IsUUID()
  factura_id: string;

  @IsNumber() @Min(1)
  monto: number;

  @IsIn(['Efectivo', 'Transferencia', 'Tarjeta Débito', 'Tarjeta Crédito', 'PSE', 'Consignación', 'Otro'])
  metodo_pago: string;

  @IsOptional() @IsString()
  referencia_pago?: string;

  @IsOptional() @IsString()
  observaciones?: string;
}
