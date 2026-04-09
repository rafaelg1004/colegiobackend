// ================================================
// src/caja/caja.module.ts
// ================================================
import { Module } from '@nestjs/common';
import { CajaController } from './caja.controller';
import { CajaService } from './caja.service';
import { SupabaseService } from '../supabase/supabase.service';

@Module({
  controllers: [CajaController],
  providers: [CajaService, SupabaseService],
  exports: [CajaService],
})
export class CajaModule {}
