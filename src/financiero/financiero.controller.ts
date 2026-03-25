import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { FinancieroService } from './financiero.service';
import {
  CreateConceptoDto, UpdateConceptoDto, CreateDescuentoDto,
  CreateFacturaDto, FacturacionMasivaDto, CreatePagoDto,
} from './dto/financiero.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('financiero')
@UseGuards(JwtAuthGuard)
export class FinancieroController {
  constructor(private finService: FinancieroService) {}

  // --- Conceptos ---
  @Post('conceptos')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'secretaria')
  crearConcepto(@Body() dto: CreateConceptoDto) {
    return this.finService.crearConcepto(dto);
  }

  @Get('conceptos')
  getConceptos(@Query('activo') activo?: string) {
    return this.finService.getConceptos(activo === 'true' ? true : activo === 'false' ? false : undefined);
  }

  @Patch('conceptos/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'secretaria')
  updateConcepto(@Param('id') id: string, @Body() dto: UpdateConceptoDto) {
    return this.finService.updateConcepto(id, dto);
  }

  // --- Descuentos ---
  @Post('descuentos')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  crearDescuento(@Body() dto: CreateDescuentoDto) {
    return this.finService.crearDescuento(dto);
  }

  @Get('descuentos')
  getDescuentos() {
    return this.finService.getDescuentos();
  }

  // --- Facturas ---
  @Post('facturas')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'secretaria')
  crearFactura(@Body() dto: CreateFacturaDto) {
    return this.finService.crearFactura(dto);
  }

  @Post('facturas/masiva')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'secretaria')
  facturacionMasiva(@Body() dto: FacturacionMasivaDto) {
    return this.finService.facturacionMasiva(dto);
  }

  @Get('facturas')
  getFacturas(
    @Query('estado') estado?: string,
    @Query('acudiente_id') acudiente_id?: string,
    @Query('estudiante_id') estudiante_id?: string,
    @Query('fecha_desde') fecha_desde?: string,
    @Query('fecha_hasta') fecha_hasta?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.finService.getFacturas({ estado, acudiente_id, estudiante_id, fecha_desde, fecha_hasta, page, limit });
  }

  @Get('facturas/:id')
  getFacturaDetalle(@Param('id') id: string) {
    return this.finService.getFacturaDetalle(id);
  }

  @Patch('facturas/:id/anular')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  anularFactura(@Param('id') id: string) {
    return this.finService.anularFactura(id);
  }

  // --- Pagos ---
  @Post('pagos')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'secretaria')
  registrarPago(@Body() dto: CreatePagoDto, @Req() req: any) {
    return this.finService.registrarPago(dto, req.user.empleado_id);
  }

  @Get('pagos/factura/:facturaId')
  getPagosPorFactura(@Param('facturaId') facturaId: string) {
    return this.finService.getPagosPorFactura(facturaId);
  }

  // --- Cartera ---
  @Get('cartera')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador', 'secretaria')
  getCartera(
    @Query('estado') estado?: string,
    @Query('acudiente_id') acudiente_id?: string,
    @Query('min_dias_mora') min_dias_mora?: string,
  ) {
    return this.finService.getCartera({ estado, acudiente_id, min_dias_mora });
  }

  @Get('cartera/resumen')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador', 'secretaria')
  getResumenCartera() {
    return this.finService.getResumenCartera();
  }

  @Patch('cartera/:id/gestion')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'secretaria')
  registrarGestion(@Param('id') id: string, @Body('gestion') gestion: string) {
    return this.finService.registrarGestionCartera(id, gestion);
  }

  // --- Reportes ---
  @Get('resumen')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador')
  getResumen(@Query('anio_lectivo_id') anioLectivoId?: string) {
    return this.finService.getResumenFinanciero(anioLectivoId);
  }
}
