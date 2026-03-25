import { Module } from '@nestjs/common';
import { AcademicoController } from './academico.controller';
import { AcademicoService } from './academico.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AcademicoController],
  providers: [AcademicoService],
  exports: [AcademicoService],
})
export class AcademicoModule {}
