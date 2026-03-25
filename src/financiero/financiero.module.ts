import { Module } from '@nestjs/common';
import { FinancieroController } from './financiero.controller';
import { FinancieroService } from './financiero.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [FinancieroController],
  providers: [FinancieroService],
  exports: [FinancieroService],
})
export class FinancieroModule {}
