import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ConfiguracionService } from './configuracion.service';
import {
  CreateInstitucionDto,
  UpdateInstitucionDto,
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
