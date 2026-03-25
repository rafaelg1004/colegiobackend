import { Module } from '@nestjs/common';
import { ComunicacionController } from './comunicacion.controller';
import { ComunicacionService } from './comunicacion.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ComunicacionController],
  providers: [ComunicacionService],
  exports: [ComunicacionService],
})
export class ComunicacionModule {}
