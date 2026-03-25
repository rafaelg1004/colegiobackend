import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { EstudiantesService } from './estudiantes.service';
import { CreateEstudianteDto, UpdateEstudianteDto, QueryEstudianteDto } from './dto/estudiante.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('estudiantes')
@UseGuards(JwtAuthGuard)
export class EstudiantesController {
  constructor(private estudiantesService: EstudiantesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador', 'secretaria')
  create(@Body() dto: CreateEstudianteDto) {
    return this.estudiantesService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryEstudianteDto) {
    return this.estudiantesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.estudiantesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador', 'secretaria')
  update(@Param('id') id: string, @Body() dto: UpdateEstudianteDto) {
    return this.estudiantesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  remove(@Param('id') id: string) {
    return this.estudiantesService.remove(id);
  }

  @Post(':id/acudiente')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador', 'secretaria')
  vincularAcudiente(
    @Param('id') id: string,
    @Body('acudiente_id') acudienteId: string,
    @Body('es_principal') esPrincipal: boolean,
  ) {
    return this.estudiantesService.vincularAcudiente(id, acudienteId, esPrincipal);
  }
}
