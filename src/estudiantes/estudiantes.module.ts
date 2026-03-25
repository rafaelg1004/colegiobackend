import { Module } from '@nestjs/common';
import { EstudiantesController } from './estudiantes.controller';
import { EstudiantesService } from './estudiantes.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [EstudiantesController],
  providers: [EstudiantesService],
  exports: [EstudiantesService],
})
export class EstudiantesModule {}
