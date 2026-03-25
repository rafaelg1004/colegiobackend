import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { EmpleadosService } from './empleados.service';
import { CreateEmpleadoDto, UpdateEmpleadoDto } from './dto/empleado.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('empleados')
@UseGuards(JwtAuthGuard)
export class EmpleadosController {
  constructor(private empleadosService: EmpleadosService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  create(@Body() dto: CreateEmpleadoDto) {
    return this.empleadosService.create(dto);
  }

  @Get()
  findAll(
    @Query('buscar') buscar?: string,
    @Query('cargo') cargo?: string,
  ) {
    return this.empleadosService.findAll(buscar, cargo);
  }

  @Get('docentes')
  getDocentes() {
    return this.empleadosService.getDocentes();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.empleadosService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  update(@Param('id') id: string, @Body() dto: UpdateEmpleadoDto) {
    return this.empleadosService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  remove(@Param('id') id: string) {
    return this.empleadosService.remove(id);
  }
}
