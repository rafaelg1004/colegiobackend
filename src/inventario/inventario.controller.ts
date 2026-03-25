import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { InventarioService } from './inventario.service';
import { CreateArticuloDto, UpdateArticuloDto, CreateMovimientoDto, CreateEspacioDto } from './dto/inventario.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('inventario')
@UseGuards(JwtAuthGuard)
export class InventarioController {
  constructor(private invService: InventarioService) {}

  // --- Categorías ---
  @Get('categorias')
  getCategorias() { return this.invService.getCategorias(); }

  @Post('categorias')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'secretaria')
  crearCategoria(@Body('nombre') nombre: string) { return this.invService.crearCategoria(nombre); }

  @Delete('categorias/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  deleteCategoria(@Param('id') id: string) { return this.invService.deleteCategoria(id); }

  // --- Artículos ---
  @Post('articulos')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'secretaria')
  crearArticulo(@Body() dto: CreateArticuloDto) { return this.invService.crearArticulo(dto); }

  @Get('articulos')
  getArticulos(
    @Query('categoria_id') categoria_id?: string,
    @Query('buscar') buscar?: string,
    @Query('alerta') alerta?: string,
  ) { return this.invService.getArticulos({ categoria_id, buscar, alerta }); }

  @Get('articulos/:id')
  getArticulo(@Param('id') id: string) { return this.invService.getArticulo(id); }

  @Patch('articulos/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'secretaria')
  updateArticulo(@Param('id') id: string, @Body() dto: UpdateArticuloDto) {
    return this.invService.updateArticulo(id, dto);
  }

  @Delete('articulos/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  deleteArticulo(@Param('id') id: string) {
    return this.invService.deleteArticulo(id);
  }

  // --- Movimientos ---
  @Post('movimientos')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'secretaria')
  registrarMovimiento(@Body() dto: CreateMovimientoDto, @Req() req: any) {
    return this.invService.registrarMovimiento(dto, req.user.empleado_id);
  }

  @Get('movimientos')
  getMovimientos(
    @Query('articulo_id') articulo_id?: string,
    @Query('tipo') tipo?: string,
    @Query('fecha_desde') fecha_desde?: string,
    @Query('fecha_hasta') fecha_hasta?: string,
  ) { return this.invService.getMovimientos({ articulo_id, tipo, fecha_desde, fecha_hasta }); }

  // --- Alertas ---
  @Get('alertas')
  getAlertas() { return this.invService.getAlertas(); }

  // --- Espacios ---
  @Post('espacios')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'secretaria')
  crearEspacio(@Body() dto: CreateEspacioDto) { return this.invService.crearEspacio(dto); }

  @Get('espacios')
  getEspacios(@Query('sede_id') sedeId?: string) { return this.invService.getEspacios(sedeId); }

  @Delete('espacios/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  deleteEspacio(@Param('id') id: string) { return this.invService.deleteEspacio(id); }

  // --- Resumen ---
  @Get('resumen')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador', 'secretaria')
  getResumen() { return this.invService.getResumen(); }
}
