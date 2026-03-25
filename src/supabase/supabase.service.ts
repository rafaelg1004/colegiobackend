// ================================================
// src/supabase/supabase.service.ts
// ================================================

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private clientAdmin: SupabaseClient;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('SUPABASE_URL');
    const serviceKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!url || !serviceKey) {
      throw new Error(
        'Faltan variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el .env',
      );
    }

    this.clientAdmin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  get admin(): SupabaseClient {
    return this.clientAdmin;
  }

  getClientForUser(accessToken: string): SupabaseClient {
    const url = this.config.get<string>('SUPABASE_URL')!;
    const anonKey = this.config.get<string>('SUPABASE_ANON_KEY')!;

    return createClient(url, anonKey, {
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    });
  }
}
