import { Controller, Get, Post, Body, Param, Query, Req, Patch, Delete, UseGuards } from '@nestjs/common';
import { ComunicacionService } from './comunicacion.service';
import { CreateCircularDto } from './dto/comunicacion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('comunicacion')
@UseGuards(JwtAuthGuard)
export class ComunicacionController {
  constructor(private readonly comunicacionService: ComunicacionService) {}

  @Post('circulares')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador', 'secretaria')
  crearCircular(@Body() dto: CreateCircularDto, @Req() req: any) {
    return this.comunicacionService.crearCircular(dto, req.user.empleado_id);
  }

  @Get('circulares')
  getCirculares(@Query('dirigida_a') dirigida_a?: string) {
    return this.comunicacionService.getCirculares(dirigida_a);
  }

  @Get('circulares/:id')
  getCircular(@Param('id') id: string) {
    return this.comunicacionService.getCircular(id);
  }

  @Patch('circulares/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador', 'secretaria')
  updateCircular(@Param('id') id: string, @Body() dto: Partial<CreateCircularDto>) {
    return this.comunicacionService.updateCircular(id, dto);
  }

  @Delete('circulares/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador')
  deleteCircular(@Param('id') id: string) {
    return this.comunicacionService.deleteCircular(id);
  }
}
