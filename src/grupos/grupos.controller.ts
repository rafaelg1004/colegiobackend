import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { GruposService } from './grupos.service';
import { CreateGrupoDto } from './dto/grupo.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('grupos')
@UseGuards(JwtAuthGuard)
export class GruposController {
  constructor(private gruposService: GruposService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador', 'secretaria')
  create(@Body() dto: CreateGrupoDto) {
    return this.gruposService.create(dto);
  }

  @Get()
  findAll(@Query('anio_lectivo_id') anioLectivoId?: string) {
    return this.gruposService.findAll(anioLectivoId);
  }

  @Get('grados')
  getGrados() {
    return this.gruposService.getGrados();
  }

  @Get(':id/estudiantes')
  getEstudiantes(@Param('id') id: string) {
    return this.gruposService.getEstudiantesDelGrupo(id);
  }
}
