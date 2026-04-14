import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { AcademicoService } from './academico.service';
import {
  CreateSedeDto,
  CreateAnioLectivoDto,
  CreatePeriodoDto,
  CreateAreaDto,
  CreateAsignaturaDto,
  CreateAsignacionDocenteDto,
  CreateNivelDto,
  CreateGradoDto,
  UpdateGradoDto,
  CreateTipoActividadDto,
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
  updateAnio(
    @Param('id') id: string,
    @Body() dto: Partial<CreateAnioLectivoDto>,
  ) {
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
  updatePeriodo(
    @Param('id') id: string,
    @Body() dto: Partial<CreatePeriodoDto>,
  ) {
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
  updateAsignatura(
    @Param('id') id: string,
    @Body() dto: Partial<CreateAsignaturaDto>,
  ) {
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
    return this.academicoService.getCargaAcademica({
      empleado_id: empleadoId,
      grupo_id: grupoId,
    });
  }

  @Post('asignar-docente')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador')
  asignarDocente(@Body() dto: CreateAsignacionDocenteDto) {
    return this.academicoService.asignarDocente(dto);
  }

  // --- NIVELES ---
  @Get('niveles')
  getNiveles() {
    return this.academicoService.getNiveles();
  }

  @Post('niveles')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  crearNivel(@Body() dto: CreateNivelDto) {
    return this.academicoService.crearNivel(dto);
  }

  // --- GRADOS ---
  @Get('grados')
  getGrados(@Query('nivel_id') nivelId?: string) {
    return this.academicoService.getGrados(nivelId);
  }

  @Post('grados')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador')
  crearGrado(@Body() dto: CreateGradoDto) {
    return this.academicoService.crearGrado(dto);
  }

  @Patch('grados/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador')
  updateGrado(@Param('id') id: string, @Body() dto: UpdateGradoDto) {
    return this.academicoService.updateGrado(id, dto);
  }

  @Delete('grados/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  deleteGrado(@Param('id') id: string) {
    return this.academicoService.deleteGrado(id);
  }

  // --- TIPOS DE ACTIVIDAD ---
  @Get('tipos-actividad')
  getTiposActividad() {
    return this.academicoService.getTiposActividad();
  }

  @Post('tipos-actividad')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador')
  crearTipoActividad(@Body() dto: CreateTipoActividadDto) {
    return this.academicoService.crearTipoActividad(dto);
  }

  @Delete('tipos-actividad/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  deleteTipoActividad(@Param('id') id: string) {
    return this.academicoService.deleteTipoActividad(id);
  }
}
