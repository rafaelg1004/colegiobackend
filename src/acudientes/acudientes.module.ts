import { Module } from '@nestjs/common';
import { AcudientesController } from './acudientes.controller';
import { AcudientesService } from './acudientes.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AcudientesController],
  providers: [AcudientesService],
  exports: [AcudientesService],
})
export class AcudientesModule {}
