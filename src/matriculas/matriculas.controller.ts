import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { MatriculasService } from './matriculas.service';
import { CreateMatriculaDto, UpdateMatriculaDto } from './dto/matricula.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('matriculas')
@UseGuards(JwtAuthGuard)
export class MatriculasController {
  constructor(private matriculasService: MatriculasService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador', 'secretaria')
  create(@Body() dto: CreateMatriculaDto) {
    return this.matriculasService.create(dto);
  }

  @Get()
  findAll(
    @Query('anio_lectivo_id') anioLectivoId?: string,
    @Query('grupo_id') grupoId?: string,
  ) {
    return this.matriculasService.findAll(anioLectivoId, grupoId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.matriculasService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador', 'secretaria')
  update(@Param('id') id: string, @Body() dto: UpdateMatriculaDto) {
    return this.matriculasService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  remove(@Param('id') id: string) {
    return this.matriculasService.remove(id);
  }

  @Post('masiva')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador', 'secretaria')
  masiva(
    @Body('estudiante_ids') estudianteIds: string[],
    @Body('grupo_id') grupoId: string,
    @Body('anio_lectivo_id') anioLectivoId: string,
  ) {
    return this.matriculasService.matriculaMasiva(estudianteIds, grupoId, anioLectivoId);
  }
}
