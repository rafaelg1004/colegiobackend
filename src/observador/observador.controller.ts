import { Controller, Get, Post, Patch, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ObservadorService } from './observador.service';
import { CreateObservacionDto, UpdateObservacionDto } from './dto/observador.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('observador')
@UseGuards(JwtAuthGuard)
export class ObservadorController {
  constructor(private readonly observadorService: ObservadorService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador', 'docente')
  crear(@Body() dto: CreateObservacionDto, @Req() req: any) {
    return this.observadorService.crearObservacion(dto, req.user.empleado_id);
  }

  @Get('estudiante/:id')
  getObservaciones(@Param('id') id: string) {
    return this.observadorService.getObservacionesEstudiante(id);
  }

  @Get('resumen/:id')
  getResumen(@Param('id') id: string) {
    return this.observadorService.getResumenEstudiante(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador', 'docente')
  update(@Param('id') id: string, @Body() dto: UpdateObservacionDto) {
    return this.observadorService.updateObservacion(id, dto);
  }

  @Patch(':id/firmar')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador', 'acudiente')
  firmar(@Param('id') id: string) {
    return this.observadorService.firmarObservacion(id);
  }
}
