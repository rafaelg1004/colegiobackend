import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConfiguracionService } from './configuracion.service';
import {
  CreateInstitucionDto,
  UpdateInstitucionDto,
  CreateNivelDto,
  CreateGradoDto,
  UpdateGradoDto,
  CreateTipoActividadDto,
  QueryGradoDto,
} from './dto/configuracion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('configuracion')
@UseGuards(JwtAuthGuard)
export class ConfiguracionController {
  constructor(private readonly configuracionService: ConfiguracionService) {}

  // ======================
  // INSTITUCIÓN
  // ======================

  @Get('institucion')
  getInstitucion() {
    return this.configuracionService.getInstitucion();
  }

  @Post('institucion')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  crearInstitucion(@Body() dto: CreateInstitucionDto) {
    return this.configuracionService.crearInstitucion(dto);
  }

  @Patch('institucion/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  updateInstitucion(
    @Param('id') id: string,
    @Body() dto: UpdateInstitucionDto,
  ) {
    return this.configuracionService.updateInstitucion(id, dto);
  }

  // ======================
  // NIVELES
  // ======================

  @Get('niveles')
  getNiveles() {
    return this.configuracionService.getNiveles();
  }

  @Post('niveles')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  crearNivel(@Body() dto: CreateNivelDto) {
    return this.configuracionService.crearNivel(dto);
  }

  // ======================
  // GRADOS
  // ======================

  @Get('grados')
  getGrados(@Query() query: QueryGradoDto) {
    return this.configuracionService.getGrados(query);
  }

  @Post('grados')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador')
  crearGrado(@Body() dto: CreateGradoDto) {
    return this.configuracionService.crearGrado(dto);
  }

  @Patch('grados/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador')
  updateGrado(@Param('id') id: string, @Body() dto: UpdateGradoDto) {
    return this.configuracionService.updateGrado(id, dto);
  }

  @Delete('grados/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  deleteGrado(@Param('id') id: string) {
    return this.configuracionService.deleteGrado(id);
  }

  // ======================
  // TIPOS DE ACTIVIDAD
  // ======================

  @Get('tipos-actividad')
  getTiposActividad() {
    return this.configuracionService.getTiposActividad();
  }

  @Post('tipos-actividad')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector', 'coordinador')
  crearTipoActividad(@Body() dto: CreateTipoActividadDto) {
    return this.configuracionService.crearTipoActividad(dto);
  }

  @Delete('tipos-actividad/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  deleteTipoActividad(@Param('id') id: string) {
    return this.configuracionService.deleteTipoActividad(id);
  }

  // ======================
  // CONCEPTOS DE COBRO
  // ======================

  @Get('conceptos-cobro')
  getConceptosCobro() {
    return this.configuracionService.getConceptosCobro();
  }

  @Post('conceptos-cobro')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  crearConceptoCobro(@Body() dto: any) {
    return this.configuracionService.crearConceptoCobro(dto);
  }

  @Patch('conceptos-cobro/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  updateConceptoCobro(@Param('id') id: string, @Body() dto: any) {
    return this.configuracionService.updateConceptoCobro(id, dto);
  }

  @Delete('conceptos-cobro/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'rector')
  deleteConceptoCobro(@Param('id') id: string) {
    return this.configuracionService.deleteConceptoCobro(id);
  }
}
