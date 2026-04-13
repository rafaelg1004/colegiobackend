// ================================================
// src/supabase/supabase.service.ts
// Wrapper que delega a DatabaseService (PostgreSQL nativo)
// Mantiene compatibilidad con código existente
// ================================================

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class SupabaseService {
  constructor(private databaseService: DatabaseService) {}

  // Delega al DatabaseService - mantiene compatibilidad con this.supabase.admin
  get admin() {
    return this.databaseService.admin;
  }

  // Método legacy - ahora usa PostgreSQL directamente
  getClientForUser(_accessToken: string) {
    // Con autenticación local, ya no necesitamos cliente por usuario
    // Retornamos el admin para mantener compatibilidad
    return this.databaseService.admin;
  }
}
