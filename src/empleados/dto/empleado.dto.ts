import { IsString, IsNotEmpty, IsOptional, IsIn, IsEmail, IsDateString } from 'class-validator';

export class CreateEmpleadoDto {
  @IsString() @IsNotEmpty()
  primer_nombre: string;

  @IsOptional() @IsString()
  segundo_nombre?: string;

  @IsString() @IsNotEmpty()
  primer_apellido: string;

  @IsOptional() @IsString()
  segundo_apellido?: string;

  @IsIn(['CC', 'CE', 'Pasaporte', 'Otro'])
  tipo_documento: string;

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

  @IsOptional() @IsIn(['Termino Fijo', 'Termino Indefinido', 'Prestacion de Servicios', 'Provisional'])
  tipo_contrato?: string;

  @IsDateString()
  fecha_ingreso: string;

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

  @IsOptional() @IsIn(['Termino Fijo', 'Termino Indefinido', 'Prestacion de Servicios', 'Provisional'])
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
}
