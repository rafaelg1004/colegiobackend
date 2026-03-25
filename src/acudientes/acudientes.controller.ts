import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AcudientesService } from './acudientes.service';
import { CreateAcudienteDto, UpdateAcudienteDto } from './dto/acudiente.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('acudientes')
@UseGuards(JwtAuthGuard)
export class AcudientesController {
  constructor(private acudientesService: AcudientesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador', 'secretaria')
  create(@Body() dto: CreateAcudienteDto) {
    return this.acudientesService.create(dto);
  }

  @Get()
  findAll(@Query('buscar') buscar?: string) {
    return this.acudientesService.findAll(buscar);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.acudientesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador', 'secretaria')
  update(@Param('id') id: string, @Body() dto: UpdateAcudienteDto) {
    return this.acudientesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  remove(@Param('id') id: string) {
    return this.acudientesService.remove(id);
  }
}
