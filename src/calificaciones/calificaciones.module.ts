import { Module } from '@nestjs/common';
import { CalificacionesController } from './calificaciones.controller';
import { CalificacionesService } from './calificaciones.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CalificacionesController],
  providers: [CalificacionesService],
  exports: [CalificacionesService],
})
export class CalificacionesModule {}
