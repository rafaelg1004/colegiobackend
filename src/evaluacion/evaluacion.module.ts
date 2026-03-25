import { Module } from '@nestjs/common';
import { EvaluacionController } from './evaluacion.controller';
import { EvaluacionService } from './evaluacion.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [EvaluacionController],
  providers: [EvaluacionService],
  exports: [EvaluacionService],
})
export class EvaluacionModule {}