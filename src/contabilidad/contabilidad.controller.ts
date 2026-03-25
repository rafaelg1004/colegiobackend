import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ContabilidadService } from './contabilidad.service';
import {
  CreateCuentaContableDto, UpdateCuentaContableDto,
  CreateMovimientoContableDto, QueryCuentaContableDto, QueryMovimientoContableDto
} from './dto/contabilidad.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('contabilidad')
@UseGuards(JwtAuthGuard)
export class ContabilidadController {
  constructor(private readonly contabilidadService: ContabilidadService) {}

  // ======================
  // CUENTAS CONTABLES
  // ======================

  @Get('cuentas')
  getCuentas(@Query() query: QueryCuentaContableDto) {
    return this.contabilidadService.getCuentas(query);
  }

  @Get('cuentas/:id')
  getCuenta(@Param('id') id: string) {
    return this.contabilidadService.getCuenta(id);
  }

  @Post('cuentas')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  crearCuenta(@Body() dto: CreateCuentaContableDto) {
    return this.contabilidadService.crearCuenta(dto);
  }

  @Patch('cuentas/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  updateCuenta(@Param('id') id: string, @Body() dto: UpdateCuentaContableDto) {
    return this.contabilidadService.updateCuenta(id, dto);
  }

  @Delete('cuentas/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  deleteCuenta(@Param('id') id: string) {
    return this.contabilidadService.deleteCuenta(id);
  }

  // ======================
  // MOVIMIENTOS CONTABLES
  // ======================

  @Get('movimientos')
  getMovimientos(@Query() query: QueryMovimientoContableDto) {
    return this.contabilidadService.getMovimientos(query);
  }

  @Post('movimientos')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'secretaria')
  crearMovimiento(@Body() dto: CreateMovimientoContableDto) {
    return this.contabilidadService.crearMovimiento(dto);
  }

  // ======================
  // REPORTES
  // ======================

  @Get('balance-comprobacion')
  getBalanceComprobacion(
    @Query('fecha_desde') fechaDesde?: string,
    @Query('fecha_hasta') fechaHasta?: string,
  ) {
    return this.contabilidadService.getBalanceComprobacion(fechaDesde, fechaHasta);
  }
}