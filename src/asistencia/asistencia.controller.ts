import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AsistenciaService } from './asistencia.service';
import { RegistrarAsistenciaDto, UpdateAsistenciaDto } from './dto/asistencia.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('asistencia')
@UseGuards(JwtAuthGuard)
export class AsistenciaController {
  constructor(private asistenciaService: AsistenciaService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'coordinador', 'docente')
  registrar(@Body() dto: RegistrarAsistenciaDto, @Req() req) {
    return this.asistenciaService.registrar(dto, req.user.empleado_id);
  }

  @Get('grupo/:grupoId')
  getPorFecha(
    @Param('grupoId') grupoId: string,
    @Query('fecha') fecha: string,
    @Query('asignatura_id') asignaturaId?: string,
  ) {
    return this.asistenciaService.getAsistenciaPorFecha(grupoId, fecha, asignaturaId);
  }

  @Get('estudiante/:estudianteId')
  getResumenEstudiante(
    @Param('estudianteId') estudianteId: string,
    @Query('grupo_id') grupoId?: string,
  ) {
    return this.asistenciaService.getResumenEstudiante(estudianteId, grupoId);
  }

  @Get('resumen-grupo/:grupoId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'coordinador', 'docente')
  getResumenGrupo(
    @Param('grupoId') grupoId: string,
    @Query('fecha_inicio') fechaInicio?: string,
    @Query('fecha_fin') fechaFin?: string,
  ) {
    return this.asistenciaService.getResumenGrupo(grupoId, fechaInicio, fechaFin);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'coordinador', 'docente')
  update(@Param('id') id: string, @Body() dto: UpdateAsistenciaDto) {
    return this.asistenciaService.update(id, dto);
  }
}
