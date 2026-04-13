// ================================================
// src/database/database.service.ts
// Servicio PostgreSQL compatible con API de Supabase
// ================================================

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient } from 'pg';
import { QueryBuilder } from './query-builder';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const host = this.config.get<string>('DB_HOST');
    const port = this.config.get<number>('DB_PORT');
    const database = this.config.get<string>('DB_NAME');
    const user = this.config.get<string>('DB_USER');
    const password = this.config.get<string>('DB_PASSWORD');

    console.log('🔧 Variables de entorno cargadas:');
    console.log('   DB_HOST:', host || '❌ NO DEFINIDO');
    console.log('   DB_PORT:', port || '❌ NO DEFINIDO');
    console.log('   DB_NAME:', database || '❌ NO DEFINIDO');
    console.log('   DB_USER:', user || '❌ NO DEFINIDO');
    console.log('   DB_PASSWORD:', password ? '✅ DEFINIDO' : '❌ NO DEFINIDO');

    if (!host || !database || !user || !password) {
      throw new Error(`Faltan variables de conexión PostgreSQL`);
    }

    this.pool = new Pool({
      host,
      port: port || 5432,
      database,
      user,
      password,
      max: 50,
      min: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: this.config.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
    });

    this.pool.on('error', (err) => {
      console.error('Error inesperado en el pool de PostgreSQL:', err);
    });

    console.log('✅ Pool de PostgreSQL inicializado');
  }

  onModuleDestroy() {
    this.pool.end();
    console.log('✅ Pool de PostgreSQL cerrado');
  }

  // Método .from() compatible con Supabase - traduce automáticamente a SQL
  from<T = any>(table: string): QueryBuilder<T> & Promise<{ data: T[] | null; error: Error | null; count?: number }> {
    const builder = new QueryBuilder<T>(table, this.pool);
    return new Proxy(builder as any, {
      get(target, prop) {
        if (prop === 'then') {
          return (resolve: any, reject: any) => target.execute().then(resolve).catch(reject);
        }
        return target[prop];
      },
    });
  }

  // Query raw SQL
  async query<T = any>(sql: string, params?: any[]): Promise<{ data: T[] | null; error: Error | null }> {
    try {
      const result = await this.pool.query(sql, params);
      return { data: result.rows, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  // Transacciones
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Getter para compatibilidad con SupabaseService
  get admin(): {
    from: <T = any>(table: string) => any;
    rpc: (name: string, params?: any) => any;
    query: <T = any>(sql: string, params?: any[]) => Promise<{ data: T[] | null; error: Error | null }>;
  } {
    return {
      from: <T = any>(table: string) => this.from<T>(table),
      rpc: (name: string, params?: any) => this.callRpc(name, params),
      query: <T = any>(sql: string, params?: any[]) => this.query<T>(sql, params),
    };
  }

  private async callRpc(name: string, params?: any): Promise<{ data: any; error: Error | null }> {
    try {
      const placeholders = params ? Object.keys(params).map((_, i) => `$${i + 1}`).join(',') : '';
      const values = params ? Object.values(params) : [];
      const sql = `SELECT * FROM ${name}(${placeholders})`;
      const result = await this.pool.query(sql, values);
      return { data: result.rows, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }
}
