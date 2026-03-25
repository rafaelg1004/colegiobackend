import {
  IsString, IsNotEmpty, IsOptional, IsUUID, IsNumber, IsInt,
  IsIn, IsDateString, IsEmail, Min, Max,
} from 'class-validator';

// --- Empleados ---
export class CreateEmpleadoDto {
  @IsString() @IsNotEmpty()
  primer_nombre: string;

  @IsOptional() @IsString()
  segundo_nombre?: string;

  @IsString() @IsNotEmpty()
  primer_apellido: string;

  @IsOptional() @IsString()
  segundo_apellido?: string;

  @IsOptional() @IsIn(['CC', 'CE', 'Pasaporte', 'Otro'])
  tipo_documento?: string;

  @IsString() @IsNotEmpty()
  numero_documento: string;

  @IsOptional() @IsDateString()
  fecha_nacimiento?: string;

  @IsOptional() @IsIn(['M', 'F', 'Otro'])
  genero?: string;

  @IsOptional() @IsString()
  direccion?: string;

  @IsOptional() @IsString()
  celular?: string;

  @IsOptional() @IsEmail()
  correo_electronico?: string;

  @IsString() @IsNotEmpty()
  cargo: string;

  @IsOptional() @IsIn(['Término Fijo', 'Término Indefinido', 'Prestación de Servicios', 'Provisional'])
  tipo_contrato?: string;

  @IsDateString()
  fecha_ingreso: string;

  @IsOptional() @IsDateString()
  fecha_retiro?: string;

  @IsOptional() @IsString()
  titulo_profesional?: string;

  @IsOptional() @IsString()
  escalafon?: string;

  @IsOptional() @IsString()
  eps?: string;

  @IsOptional() @IsString()
  arl?: string;

  @IsOptional() @IsString()
  fondo_pensiones?: string;

  @IsOptional() @IsString()
  caja_compensacion?: string;

  @IsOptional() @IsString()
  cuenta_bancaria?: string;

  @IsOptional() @IsString()
  banco?: string;

  @IsOptional() @IsIn(['Ahorros', 'Corriente'])
  tipo_cuenta?: string;

  @IsOptional() @IsIn(['Activo', 'Inactivo', 'Retirado', 'Licencia'])
  estado?: string;

  @IsOptional() @IsString()
  foto_perfil_url?: string;
}

export class UpdateEmpleadoDto {
  @IsOptional() @IsString()
  primer_nombre?: string;

  @IsOptional() @IsString()
  segundo_nombre?: string;

  @IsOptional() @IsString()
  primer_apellido?: string;

  @IsOptional() @IsString()
  segundo_apellido?: string;

  @IsOptional() @IsString()
  direccion?: string;

  @IsOptional() @IsString()
  celular?: string;

  @IsOptional() @IsEmail()
  correo_electronico?: string;

  @IsOptional() @IsString()
  cargo?: string;

  @IsOptional() @IsIn(['Término Fijo', 'Término Indefinido', 'Prestación de Servicios', 'Provisional'])
  tipo_contrato?: string;

  @IsOptional() @IsDateString()
  fecha_retiro?: string;

  @IsOptional() @IsString()
  titulo_profesional?: string;

  @IsOptional() @IsString()
  escalafon?: string;

  @IsOptional() @IsString()
  eps?: string;

  @IsOptional() @IsString()
  arl?: string;

  @IsOptional() @IsString()
  fondo_pensiones?: string;

  @IsOptional() @IsString()
  caja_compensacion?: string;

  @IsOptional() @IsString()
  cuenta_bancaria?: string;

  @IsOptional() @IsString()
  banco?: string;

  @IsOptional() @IsIn(['Ahorros', 'Corriente'])
  tipo_cuenta?: string;

  @IsOptional() @IsIn(['Activo', 'Inactivo', 'Retirado', 'Licencia'])
  estado?: string;

  @IsOptional() @IsString()
  foto_perfil_url?: string;
}

// --- Nómina ---
export class CreateNominaDto {
  @IsUUID()
  empleado_id: string;

  @IsInt() @Min(1) @Max(12)
  periodo_mes: number;

  @IsInt()
  periodo_anio: number;

  @IsNumber() @Min(0)
  salario_base: number;

  @IsOptional() @IsNumber() @Min(0)
  auxilio_transporte?: number;

  @IsOptional() @IsNumber() @Min(0)
  horas_extras?: number;

  @IsOptional() @IsNumber() @Min(0)
  bonificaciones?: number;

  @IsOptional() @IsNumber() @Min(0)
  retencion_fuente?: number;

  @IsOptional() @IsNumber() @Min(0)
  otros_descuentos?: number;
}

export class LiquidarNominaMasivaDto {
  @IsInt() @Min(1) @Max(12)
  periodo_mes: number;

  @IsInt()
  periodo_anio: number;
}

// --- Novedades ---
export class CreateNovedadDto {
  @IsUUID()
  empleado_id: string;

  @IsIn(['Incapacidad', 'Licencia', 'Vacaciones', 'Permiso', 'Suspensión', 'Otro'])
  tipo: string;

  @IsDateString()
  fecha_inicio: string;

  @IsOptional() @IsDateString()
  fecha_fin?: string;

  @IsOptional() @IsInt()
  dias?: number;

  @IsOptional() @IsString()
  descripcion?: string;

  @IsOptional() @IsString()
  soporte_url?: string;
}
