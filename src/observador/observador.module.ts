import { Module } from '@nestjs/common';
import { ObservadorController } from './observador.controller';
import { ObservadorService } from './observador.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ObservadorController],
  providers: [ObservadorService],
  exports: [ObservadorService],
})
export class ObservadorModule {}
