import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CalificacionesService } from './calificaciones.service';
import { CreateActividadDto, RegistrarNotasDto, UpdateNotaDto } from './dto/calificacion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('calificaciones')
@UseGuards(JwtAuthGuard)
export class CalificacionesController {
  constructor(private calService: CalificacionesService) {}

  @Post('actividades')
  @UseGuards(RolesGuard)
  @Roles('admin', 'coordinador', 'docente')
  crearActividad(@Body() dto: CreateActividadDto) {
    return this.calService.crearActividad(dto);
  }

  @Patch('actividades/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'coordinador', 'docente')
  updateActividad(@Param('id') id: string, @Body() dto: Partial<CreateActividadDto>) {
    return this.calService.updateActividad(id, dto);
  }

  @Delete('actividades/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'coordinador')
  deleteActividad(@Param('id') id: string) {
    return this.calService.deleteActividad(id);
  }

  @Get('actividades')
  getActividades(
    @Query('grupo_id') grupoId: string,
    @Query('periodo_id') periodoId: string,
    @Query('asignatura_id') asignaturaId?: string,
  ) {
    return this.calService.getActividadesPorGrupo(grupoId, periodoId, asignaturaId);
  }

  @Get('actividades/:id')
  getActividad(@Param('id') id: string) {
    return this.calService.getActividad(id);
  }

  @Get('tipos-actividad')
  getTiposActividad() {
    return this.calService.getTiposActividad();
  }

  @Post('registrar')
  @UseGuards(RolesGuard)
  @Roles('admin', 'coordinador', 'docente')
  registrarNotas(@Body() dto: RegistrarNotasDto) {
    return this.calService.registrarNotas(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'coordinador', 'docente')
  actualizarNota(@Param('id') id: string, @Body() dto: UpdateNotaDto) {
    return this.calService.actualizarNota(id, dto);
  }

  @Get('estudiante/:estudianteId')
  getNotasEstudiante(
    @Param('estudianteId') estudianteId: string,
    @Query('periodo_id') periodoId?: string,
  ) {
    return this.calService.getNotasEstudiante(estudianteId, periodoId);
  }

  @Get('boletin/:estudianteId')
  getBoletin(
    @Param('estudianteId') estudianteId: string,
    @Query('anio_lectivo_id') anioLectivoId?: string,
  ) {
    return this.calService.getBoletin(estudianteId, anioLectivoId);
  }

  @Get('planilla')
  @UseGuards(RolesGuard)
  @Roles('admin', 'coordinador', 'docente')
  getPlanilla(
    @Query('grupo_id') grupoId: string,
    @Query('asignatura_id') asignaturaId: string,
    @Query('periodo_id') periodoId: string,
  ) {
    return this.calService.getPlanilla(grupoId, asignaturaId, periodoId);
  }
}
