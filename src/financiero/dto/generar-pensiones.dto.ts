import { IsNumber, IsOptional, IsString } from 'class-validator';

export class GenerarPensionesDto {
  @IsNumber()
  mes: number;

  @IsNumber()
  anio: number;

  @IsOptional()
  @IsString()
  anio_lectivo_id?: string;

  @IsOptional()
  @IsString()
  articulo_id?: string;

  @IsOptional()
  @IsString()
  concepto_cobro_id?: string;
}
