import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { NominaService } from './nomina.service';
import {
  CreateEmpleadoDto, UpdateEmpleadoDto,
  CreateNominaDto, LiquidarNominaMasivaDto, CreateNovedadDto,
} from './dto/nomina.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('nomina')
@UseGuards(JwtAuthGuard)
export class NominaController {
  constructor(private nominaService: NominaService) {}

  // --- Empleados ---
  @Post('empleados')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'secretaria')
  crearEmpleado(@Body() dto: CreateEmpleadoDto) {
    return this.nominaService.crearEmpleado(dto);
  }

  @Get('empleados')
  getEmpleados(
    @Query('cargo') cargo?: string,
    @Query('estado') estado?: string,
    @Query('buscar') buscar?: string,
  ) {
    return this.nominaService.getEmpleados({ cargo, estado, buscar });
  }

  @Get('empleados/docentes')
  getDocentes() {
    return this.nominaService.getEmpleados({ cargo: 'Docente' });
  }

  @Get('empleados/:id')
  getEmpleado(@Param('id') id: string) {
    return this.nominaService.getEmpleado(id);
  }

  @Patch('empleados/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'secretaria')
  updateEmpleado(@Param('id') id: string, @Body() dto: UpdateEmpleadoDto) {
    return this.nominaService.updateEmpleado(id, dto);
  }

  @Delete('empleados/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  deleteEmpleado(@Param('id') id: string) {
    return this.nominaService.deleteEmpleado(id);
  }

  // --- Liquidación de nómina ---
  @Post('liquidar')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  liquidarNomina(@Body() dto: CreateNominaDto) {
    return this.nominaService.liquidarNomina(dto);
  }

  @Post('liquidar-masiva')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  liquidarMasiva(@Body() dto: LiquidarNominaMasivaDto) {
    return this.nominaService.liquidarNominaMasiva(dto);
  }

  // --- Consultar nóminas ---
  @Get('listado')
  getNominas(
    @Query('mes') mes?: string,
    @Query('anio') anio?: string,
    @Query('empleado_id') empleado_id?: string,
    @Query('estado') estado?: string,
  ) {
    return this.nominaService.getNominas({ mes, anio, empleado_id, estado });
  }

  @Get('detalle/:id')
  getNominaDetalle(@Param('id') id: string) {
    return this.nominaService.getNominaDetalle(id);
  }

  // --- Pagar nóminas ---
  @Patch('pagar/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  marcarPagada(@Param('id') id: string, @Body('fecha_pago') fechaPago?: string) {
    return this.nominaService.marcarNominaPagada(id, fechaPago);
  }

  @Post('pagar-masivo')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  pagarMasivo(@Body('mes') mes: number, @Body('anio') anio: number) {
    return this.nominaService.marcarNominasPagadasMasivo(mes, anio);
  }

  // --- Editar nómina ---
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  updateNomina(@Param('id') id: string, @Body() dto: Partial<CreateNominaDto>) {
    return this.nominaService.updateNomina(id, dto);
  }

  // --- Novedades ---
  @Post('novedades')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador', 'secretaria')
  crearNovedad(@Body() dto: CreateNovedadDto) {
    return this.nominaService.crearNovedad(dto);
  }

  @Get('novedades')
  getNovedades(
    @Query('empleado_id') empleado_id?: string,
    @Query('tipo') tipo?: string,
    @Query('mes') mes?: string,
    @Query('anio') anio?: string,
  ) {
    return this.nominaService.getNovedades({ empleado_id, tipo, mes, anio });
  }

  // --- Reportes ---
  @Get('resumen/:mes/:anio')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  getResumen(@Param('mes') mes: string, @Param('anio') anio: string) {
    return this.nominaService.getResumenNomina(parseInt(mes), parseInt(anio));
  }
}
