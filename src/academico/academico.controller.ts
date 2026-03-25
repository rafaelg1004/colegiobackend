import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
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

  @Post('asignaturas')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador')
  crearAsignatura(@Body() dto: CreateAsignaturaDto) {
    return this.academicoService.crearAsignatura(dto);
  }

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
