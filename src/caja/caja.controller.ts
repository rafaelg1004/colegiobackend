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
}
