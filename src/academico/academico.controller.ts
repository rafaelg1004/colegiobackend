import { Controller, Get, Post, Body, Query, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { AcademicoService } from './academico.service';
import {
  CreateSedeDto, CreateAnioLectivoDto, CreatePeriodoDto,
  CreateAreaDto, CreateAsignaturaDto, CreateAsignacionDocenteDto
} from './dto/academico.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('academico')
@UseGuards(JwtAuthGuard)
export class AcademicoController {
  constructor(private readonly academicoService: AcademicoService) {}

  // --- SEDES ---
  @Get('sedes')
  getSedes() {
    return this.academicoService.getSedes();
  }

  @Post('sedes')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  crearSede(@Body() dto: CreateSedeDto) {
    return this.academicoService.crearSede(dto);
  }

  @Patch('sedes/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  updateSede(@Param('id') id: string, @Body() dto: Partial<CreateSedeDto>) {
    return this.academicoService.updateSede(id, dto);
  }

  @Delete('sedes/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  deleteSede(@Param('id') id: string) {
    return this.academicoService.deleteSede(id);
  }

  // --- AÑOS LECTIVOS ---
  @Get('anios-lectivos')
  getAnios() {
    return this.academicoService.getAniosLectivos();
  }

  @Post('anios-lectivos')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  crearAnio(@Body() dto: CreateAnioLectivoDto) {
    return this.academicoService.crearAnioLectivo(dto);
  }

  @Patch('anios-lectivos/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  updateAnio(@Param('id') id: string, @Body() dto: Partial<CreateAnioLectivoDto>) {
    return this.academicoService.updateAnioLectivo(id, dto);
  }

  @Delete('anios-lectivos/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  deleteAnio(@Param('id') id: string) {
    return this.academicoService.deleteAnioLectivo(id);
  }

  // --- PERIODOS ---
  @Get('periodos')
  getPeriodos(@Query('anio_lectivo_id') anioId: string) {
    return this.academicoService.getPeriodos(anioId);
  }

  @Post('periodos')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  crearPeriodo(@Body() dto: CreatePeriodoDto) {
    return this.academicoService.crearPeriodo(dto);
  }

  @Patch('periodos/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  updatePeriodo(@Param('id') id: string, @Body() dto: Partial<CreatePeriodoDto>) {
    return this.academicoService.updatePeriodo(id, dto);
  }

  @Delete('periodos/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  deletePeriodo(@Param('id') id: string) {
    return this.academicoService.deletePeriodo(id);
  }

  // --- ÁREAS ---
  @Get('areas')
  getAreas() {
    return this.academicoService.getAreas();
  }

  @Post('areas')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador')
  crearArea(@Body() dto: CreateAreaDto) {
    return this.academicoService.crearArea(dto);
  }

  @Patch('areas/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador')
  updateArea(@Param('id') id: string, @Body() dto: Partial<CreateAreaDto>) {
    return this.academicoService.updateArea(id, dto);
  }

  @Delete('areas/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  deleteArea(@Param('id') id: string) {
    return this.academicoService.deleteArea(id);
  }

  // --- ASIGNATURAS ---
  @Get('asignaturas')
  getAsignaturas() {
    return this.academicoService.getAsignaturas();
  }

  @Post('asignaturas')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador')
  crearAsignatura(@Body() dto: CreateAsignaturaDto) {
    return this.academicoService.crearAsignatura(dto);
  }

  @Patch('asignaturas/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador')
  updateAsignatura(@Param('id') id: string, @Body() dto: Partial<CreateAsignaturaDto>) {
    return this.academicoService.updateAsignatura(id, dto);
  }

  @Delete('asignaturas/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  deleteAsignatura(@Param('id') id: string) {
    return this.academicoService.deleteAsignatura(id);
  }

  // --- CARGA ACADÉMICA ---
  @Get('carga')
  getCarga(
    @Query('empleado_id') empleadoId?: string,
    @Query('grupo_id') grupoId?: string,
  ) {
    return this.academicoService.getCargaAcademica({ empleado_id: empleadoId, grupo_id: grupoId });
  }

  @Post('asignar-docente')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador')
  asignarDocente(@Body() dto: CreateAsignacionDocenteDto) {
    return this.academicoService.asignarDocente(dto);
  }
}
