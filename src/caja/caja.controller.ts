// ================================================
// src/caja/caja.controller.ts
// ================================================
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CajaService } from './caja.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('caja')
@UseGuards(JwtAuthGuard)
export class CajaController {
  constructor(private cajaService: CajaService) {}

  @Get('conceptos')
  getConceptos() {
    return this.cajaService.getConceptos();
  }

  @Get('conceptos-cobro')
  getConceptosCobro() {
    return this.cajaService.getConceptosCobro();
  }

  @Get('conceptos-cobro/:id/articulos')
  getArticulosConcepto(@Param('id') id: string) {
    return this.cajaService.getArticulosConcepto(id);
  }

  @Get('articulos-por-categoria/:categoriaId')
  getArticulosPorCategoria(@Param('categoriaId') categoriaId: string) {
    return this.cajaService.getArticulosPorCategoria(categoriaId);
  }

  @Get('buscar-estudiantes')
  buscarEstudiantes(@Query('q') query: string) {
    return this.cajaService.buscarEstudiantes(query || '');
  }

  @Get('siguiente-comprobante')
  async getSiguienteComprobante() {
    const numero = await this.cajaService.generarNumeroComprobante();
    return { numero_comprobante: numero };
  }

  @Get('movimientos')
  getMovimientos(
    @Query('fecha_desde') fechaDesde?: string,
    @Query('fecha_hasta') fechaHasta?: string,
    @Query('tipo') tipo?: 'INGRESO' | 'EGRESO',
    @Query('concepto') concepto?: string,
  ) {
    return this.cajaService.getMovimientos({
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta,
      tipo,
      concepto,
    });
  }

  @Post('movimientos')
  crearMovimiento(@Body() movimiento: any, @Request() req: any) {
    // Usar el ID del usuario desde el JWT (sub = user ID)
    const usuarioId = req.user?.sub || req.user?.id || null;
    return this.cajaService.crearMovimiento(movimiento, usuarioId);
  }

  @Delete('movimientos/:id')
  eliminarMovimiento(@Param('id') id: string) {
    return this.cajaService.eliminarMovimiento(id);
  }

  @Get('resumen')
  getResumen(
    @Query('fecha_desde') fechaDesde?: string,
    @Query('fecha_hasta') fechaHasta?: string,
  ) {
    return this.cajaService.getResumen(fechaDesde, fechaHasta);
  }

  @Get('reporte-mensual')
  getReporteMensual(@Query('anio') anio: string, @Query('mes') mes: string) {
    return this.cajaService.getReporteMensual(
      parseInt(anio, 10),
      parseInt(mes, 10),
    );
  }

  // ======================
  // FACTURAS
  // ======================

  @Get('facturas')
  getFacturas(
    @Query('acudiente_id') acudienteId?: string,
    @Query('estudiante_id') estudianteId?: string,
    @Query('estado') estado?: string,
    @Query('fecha_desde') fechaDesde?: string,
    @Query('fecha_hasta') fechaHasta?: string,
  ) {
    return this.cajaService.getFacturas({
      acudiente_id: acudienteId,
      estudiante_id: estudianteId,
      estado,
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta,
    });
  }

  @Get('facturas/:id')
  getFacturaById(@Param('id') id: string) {
    return this.cajaService.getFacturaById(id);
  }

  @Post('facturas')
  crearFactura(@Body() dto: any, @Request() req: any) {
    const usuarioId = req.user?.sub || req.user?.id || null;
    return this.cajaService.crearFactura(dto, usuarioId);
  }

  @Delete('facturas/:id/anular')
  anularFactura(@Param('id') id: string) {
    return this.cajaService.anularFactura(id);
  }

  @Post('facturas/:id/pagar')
  pagarFactura(
    @Param('id') id: string,
    @Body() data: { monto_pagado: number },
  ) {
    return this.cajaService.pagarFactura(id, data.monto_pagado);
  }

  // ======================
  // TRANSACCIÓN UNIFICADA
  // ======================

  @Post('transaccion')
  crearTransaccion(@Body() dto: any, @Request() req: any) {
    const usuarioId = req.user?.sub || req.user?.id || null;
    return this.cajaService.crearTransaccion(dto, usuarioId);
  }
}
