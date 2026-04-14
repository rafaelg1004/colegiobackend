import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Body, 
  Param, 
  Query, 
  UseGuards 
} from '@nestjs/common';
import { FacturacionService } from './facturacion.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('facturacion')
@UseGuards(JwtAuthGuard)
export class FacturacionController {
  constructor(private readonly facturacionService: FacturacionService) {}

  @Get('facturas')
  getFacturas(
    @Query('acudiente_id') acudienteId?: string,
    @Query('estudiante_id') estudianteId?: string,
    @Query('estado') estado?: string,
    @Query('fecha_desde') fechaDesde?: string,
    @Query('fecha_hasta') fechaHasta?: string,
  ) {
    return this.facturacionService.getFacturas({
      acudiente_id: acudienteId,
      estudiante_id: estudianteId,
      estado,
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta,
    });
  }

  @Get('facturas/:id')
  getFacturaById(@Param('id') id: string) {
    return this.facturacionService.getFacturaById(id);
  }

  @Post('facturas')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'secretaria')
  crearFactura(@Body() dto: any) {
    return this.facturacionService.crearFactura(dto);
  }

  @Patch('facturas/:id/anular')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  anularFactura(@Param('id') id: string) {
    return this.facturacionService.anularFactura(id);
  }

  @Patch('facturas/:id/pagar')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'secretaria')
  pagarFactura(
    @Param('id') id: string,
    @Body() data: { monto_pagado: number; metodo_pago?: string }
  ) {
    return this.facturacionService.pagarFactura(id, data.monto_pagado, data.metodo_pago);
  }

  @Get('estadisticas')
  getEstadisticas(
    @Query('fecha_desde') fechaDesde: string,
    @Query('fecha_hasta') fechaHasta: string,
  ) {
    return this.facturacionService.getEstadisticasFacturacion(fechaDesde, fechaHasta);
  }
}
