import { Module } from '@nestjs/common';
import { MatriculasController } from './matriculas.controller';
import { MatriculasService } from './matriculas.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MatriculasController],
  providers: [MatriculasService],
  exports: [MatriculasService],
})
export class MatriculasModule {}
