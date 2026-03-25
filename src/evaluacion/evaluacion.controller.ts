import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { EvaluacionService } from './evaluacion.service';
import {
  CreateActividadEvaluativaDto, UpdateActividadEvaluativaDto,
  CreateBloqueHorarioDto, UpdateBloqueHorarioDto,
  CreateNotaPeriodoDto, UpdateNotaPeriodoDto,
  QueryActividadDto, QueryBloqueHorarioDto, QueryNotaPeriodoDto
} from './dto/evaluacion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('evaluacion')
@UseGuards(JwtAuthGuard)
export class EvaluacionController {
  constructor(private readonly evaluacionService: EvaluacionService) {}

  // ======================
  // ACTIVIDADES EVALUATIVAS
  // ======================

  @Get('actividades')
  getActividades(@Query() query: QueryActividadDto) {
    return this.evaluacionService.getActividades(query);
  }

  @Get('actividades/:id')
  getActividad(@Param('id') id: string) {
    return this.evaluacionService.getActividad(id);
  }

  @Post('actividades')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador', 'docente')
  crearActividad(@Body() dto: CreateActividadEvaluativaDto) {
    return this.evaluacionService.crearActividad(dto);
  }

  @Patch('actividades/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador', 'docente')
  updateActividad(@Param('id') id: string, @Body() dto: UpdateActividadEvaluativaDto) {
    return this.evaluacionService.updateActividad(id, dto);
  }

  @Delete('actividades/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador')
  deleteActividad(@Param('id') id: string) {
    return this.evaluacionService.deleteActividad(id);
  }

  // ======================
  // BLOQUES HORARIOS
  // ======================

  @Get('bloques-horarios')
  getBloquesHorarios(@Query() query: QueryBloqueHorarioDto) {
    return this.evaluacionService.getBloquesHorarios(query);
  }

  @Get('bloques-horarios/:id')
  getBloqueHorario(@Param('id') id: string) {
    return this.evaluacionService.getBloqueHorario(id);
  }

  @Post('bloques-horarios')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador')
  crearBloqueHorario(@Body() dto: CreateBloqueHorarioDto) {
    return this.evaluacionService.crearBloqueHorario(dto);
  }

  @Patch('bloques-horarios/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador')
  updateBloqueHorario(@Param('id') id: string, @Body() dto: UpdateBloqueHorarioDto) {
    return this.evaluacionService.updateBloqueHorario(id, dto);
  }

  @Delete('bloques-horarios/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  deleteBloqueHorario(@Param('id') id: string) {
    return this.evaluacionService.deleteBloqueHorario(id);
  }

  // ======================
  // NOTAS POR PERIODO
  // ======================

  @Get('notas-periodo')
  getNotasPeriodo(@Query() query: QueryNotaPeriodoDto) {
    return this.evaluacionService.getNotasPeriodo(query);
  }

  @Get('notas-periodo/:id')
  getNotaPeriodo(@Param('id') id: string) {
    return this.evaluacionService.getNotaPeriodo(id);
  }

  @Post('notas-periodo')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador', 'docente')
  crearNotaPeriodo(@Body() dto: CreateNotaPeriodoDto) {
    return this.evaluacionService.crearNotaPeriodo(dto);
  }

  @Patch('notas-periodo/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador', 'docente')
  updateNotaPeriodo(@Param('id') id: string, @Body() dto: UpdateNotaPeriodoDto) {
    return this.evaluacionService.updateNotaPeriodo(id, dto);
  }

  @Delete('notas-periodo/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador')
  deleteNotaPeriodo(@Param('id') id: string) {
    return this.evaluacionService.deleteNotaPeriodo(id);
  }
}