import { Module } from '@nestjs/common';
import { NominaController } from './nomina.controller';
import { NominaService } from './nomina.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [NominaController],
  providers: [NominaService],
  exports: [NominaService],
})
export class NominaModule {}
