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
  crearMovimiento(@Body() movimiento: any) {
    return this.cajaService.crearMovimiento(movimiento);
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
  getReporteMensual(
    @Query('anio') anio: string,
    @Query('mes') mes: string,
  ) {
    return this.cajaService.getReporteMensual(
      parseInt(anio, 10),
      parseInt(mes, 10),
    );
  }
}
