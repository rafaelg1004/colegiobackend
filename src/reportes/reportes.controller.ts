import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ReportesService } from './reportes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('reportes')
@UseGuards(JwtAuthGuard)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('boletin/:estudianteId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador', 'secretaria', 'docente', 'acudiente')
  getBoletin(
    @Param('estudianteId') estudianteId: string,
    @Query('periodo_id') periodoId: string
  ) {
    return this.reportesService.getDatosBoletin(estudianteId, periodoId);
  }

  @Get('dashboard/stats')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador')
  getStats() {
    return this.reportesService.getDashboardStats();
  }

  @Get('grupo/:grupoId/estadisticas')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador', 'docente')
  getEstadisticasGrupo(
    @Param('grupoId') grupoId: string,
    @Query('periodo_id') periodoId: string
  ) {
    return this.reportesService.getEstadisticasGrupo(grupoId, periodoId);
  }
}
