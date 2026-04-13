// ================================================
// src/database/database.service.ts
// Servicio PostgreSQL compatible con API de Supabase
// ================================================

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, QueryResult } from 'pg';

// Query Builder compatible con Supabase
class QueryBuilder<T = any> {
  private table: string;
  private client: Pool | PoolClient;
  private selectColumns: string = '*';
  private filters: Array<{ column: string; operator: string; value: any }> = [];
  private orderBy?: { column: string; ascending: boolean };
  private limitValue?: number;
  private singleMode: boolean = false;
  private countMode: 'exact' | 'estimated' | 'planned' | null = null;
  private headOnly: boolean = false;

  constructor(table: string, client: Pool | PoolClient) {
    this.table = table;
    this.client = client;
  }

  select(
    columns: string,
    options?: { count?: 'exact' | 'estimated' | 'planned'; head?: boolean },
  ): QueryBuilder<T> {
    this.selectColumns = columns;
    if (options?.count) this.countMode = options.count;
    if (options?.head) this.headOnly = options.head;
    return this;
  }

  eq(column: string, value: any): QueryBuilder<T> {
    this.filters.push({ column, operator: '=', value });
    return this;
  }

  neq(column: string, value: any): QueryBuilder<T> {
    this.filters.push({ column, operator: '!=', value });
    return this;
  }

  gt(column: string, value: any): QueryBuilder<T> {
    this.filters.push({ column, operator: '>', value });
    return this;
  }

  gte(column: string, value: any): QueryBuilder<T> {
    this.filters.push({ column, operator: '>=', value });
    return this;
  }

  lt(column: string, value: any): QueryBuilder<T> {
    this.filters.push({ column, operator: '<', value });
    return this;
  }

  lte(column: string, value: any): QueryBuilder<T> {
    this.filters.push({ column, operator: '<=', value });
    return this;
  }

  like(column: string, value: string): QueryBuilder<T> {
    this.filters.push({ column, operator: 'LIKE', value });
    return this;
  }

  ilike(column: string, value: string): QueryBuilder<T> {
    this.filters.push({ column, operator: 'ILIKE', value });
    return this;
  }

  in(column: string, values: any[]): QueryBuilder<T> {
    this.filters.push({ column, operator: 'IN', value: values });
    return this;
  }

  is(column: string, value: any): QueryBuilder<T> {
    this.filters.push({ column, operator: 'IS', value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): QueryBuilder<T> {
    this.orderBy = { column, ascending: options?.ascending ?? true };
    return this;
  }

  limit(n: number): QueryBuilder<T> {
    this.limitValue = n;
    return this;
  }

  single(): QueryBuilder<T> {
    this.singleMode = true;
    this.limit(1);
    return this;
  }

  async execute(): Promise<{
    data: T[] | null;
    error: Error | null;
    count?: number;
  }> {
    try {
      let sql = `SELECT ${this.selectColumns} FROM ${this.table}`;
      const params: any[] = [];
      let paramIndex = 1;

      // WHERE clause
      if (this.filters.length > 0) {
        const whereClauses = this.filters.map((f) => {
          if (f.operator === 'IN') {
            const placeholders = f.value
              .map(() => `$${paramIndex++}`)
              .join(',');
            params.push(...f.value);
            return `"${f.column}" IN (${placeholders})`;
          } else if (f.operator === 'IS') {
            return `"${f.column}" IS ${f.value === null ? 'NULL' : 'NOT NULL'}`;
          } else {
            params.push(f.value);
            return `"${f.column}" ${f.operator} $${paramIndex++}`;
          }
        });
        sql += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      // ORDER BY
      if (this.orderBy) {
        sql += ` ORDER BY "${this.orderBy.column}" ${this.orderBy.ascending ? 'ASC' : 'DESC'}`;
      }

      // LIMIT
      if (this.limitValue) {
        sql += ` LIMIT ${this.limitValue}`;
      }

      const result: QueryResult = await this.client.query(sql, params);

      if (this.headOnly) {
        return {
          data: null,
          error: null,
          count: parseInt(result.rows[0]?.count || '0'),
        };
      }

      // Handle joins by parsing foreign key relationships
      const processedData = this.processJoins(result.rows);

      return {
        data: this.singleMode ? processedData[0] || null : processedData,
        error: null,
        count: this.countMode
          ? parseInt(result.rows[0]?.count || '0')
          : undefined,
      };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  private processJoins(rows: any[]): any[] {
    // Simple join processing - converts flat rows to nested objects based on column naming
    return rows.map((row) => {
      const processed: any = {};
      for (const [key, value] of Object.entries(row)) {
        if (key.includes(':')) {
          // Foreign key relationship: table:column
          const [relationName, columnName] = key.split(':');
          if (!processed[relationName]) processed[relationName] = {};
          processed[relationName][columnName] = value;
        } else {
          processed[key] = value;
        }
      }
      return processed;
    });
  }

  // Alias for execute to match Supabase API
  async then(
    callback: (result: {
      data: T[] | null;
      error: Error | null;
      count?: number;
    }) => void,
  ): Promise<void> {
    const result = await this.execute();
    callback(result);
  }
}

// Insert/Update/Delete Builder
class MutationBuilder<T = any> {
  private table: string;
  private client: Pool | PoolClient;
  private operation: 'insert' | 'update' | 'delete';
  private data?: Partial<T> | Partial<T>[];
  private filters: Array<{ column: string; operator: string; value: any }> = [];
  private returnColumns: string = '*';

  constructor(
    table: string,
    client: Pool | PoolClient,
    operation: 'insert' | 'update' | 'delete',
  ) {
    this.table = table;
    this.client = client;
    this.operation = operation;
  }

  insert(data: Partial<T> | Partial<T>[]): MutationBuilder<T> {
    this.data = data;
    return this;
  }

  update(data: Partial<T>): MutationBuilder<T> {
    this.data = data;
    return this;
  }

  eq(column: string, value: any): MutationBuilder<T> {
    this.filters.push({ column, operator: '=', value });
    return this;
  }

  select(columns: string = '*'): MutationBuilder<T> {
    this.returnColumns = columns;
    return this;
  }

  async execute(): Promise<{ data: T | T[] | null; error: Error | null }> {
    try {
      let sql = '';
      const params: any[] = [];
      let paramIndex = 1;

      if (this.operation === 'insert') {
        const dataArray = Array.isArray(this.data) ? this.data : [this.data];
        if (dataArray.length === 0) return { data: null, error: null };

        const columns = Object.keys(dataArray[0] || {});
        const placeholders = dataArray
          .map(() => `(${columns.map(() => `$${paramIndex++}`).join(',')})`)
          .join(',');

        dataArray.forEach((d) =>
          columns.forEach((c) => params.push((d as any)[c])),
        );
        sql = `INSERT INTO ${this.table} (${columns.map((c) => `"${c}"`).join(',')}) VALUES ${placeholders} RETURNING ${this.returnColumns}`;
      } else if (this.operation === 'update') {
        if (!this.data)
          return {
            data: null,
            error: new Error('No data provided for update'),
          };

        const setClauses = Object.keys(this.data).map((key) => {
          params.push((this.data as any)[key]);
          return `"${key}" = $${paramIndex++}`;
        });

        sql = `UPDATE ${this.table} SET ${setClauses.join(', ')}`;

        // WHERE clause
        if (this.filters.length > 0) {
          const whereClauses = this.filters.map((f) => {
            params.push(f.value);
            return `"${f.column}" ${f.operator} $${paramIndex++}`;
          });
          sql += ` WHERE ${whereClauses.join(' AND ')}`;
        }
        sql += ` RETURNING ${this.returnColumns}`;
      } else if (this.operation === 'delete') {
        sql = `DELETE FROM ${this.table}`;

        if (this.filters.length > 0) {
          const whereClauses = this.filters.map((f) => {
            params.push(f.value);
            return `"${f.column}" ${f.operator} $${paramIndex++}`;
          });
          sql += ` WHERE ${whereClauses.join(' AND ')}`;
        }
        sql += ` RETURNING ${this.returnColumns}`;
      }

      const result: QueryResult = await this.client.query(sql, params);

      return {
        data: Array.isArray(this.data) ? result.rows : result.rows[0] || null,
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async single(): Promise<{ data: T | null; error: Error | null }> {
    const result = await this.execute();
    return {
      data: Array.isArray(result.data) ? result.data[0] || null : result.data,
      error: result.error,
    };
  }

  // Alias for await compatibility
  async then(
    callback: (result: { data: T | T[] | null; error: Error | null }) => void,
  ): Promise<void> {
    const result = await this.execute();
    callback(result);
  }
}

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

    // Debug: mostrar todas las variables de entorno
    console.log('🔧 Variables de entorno cargadas:');
    console.log('   DB_HOST:', host || '❌ NO DEFINIDO');
    console.log('   DB_PORT:', port || '❌ NO DEFINIDO');
    console.log('   DB_NAME:', database || '❌ NO DEFINIDO');
    console.log('   DB_USER:', user || '❌ NO DEFINIDO');
    console.log(
      '   DB_PASSWORD:',
      password
        ? '✅ DEFINIDO (' + password.length + ' chars)'
        : '❌ NO DEFINIDO',
    );
    console.log(
      '   JWT_SECRET:',
      this.config.get<string>('JWT_SECRET') || '❌ NO DEFINIDO',
    );

    if (!host || !database || !user || !password) {
      throw new Error(
        `Faltan variables de conexión PostgreSQL: DB_HOST=${host}, DB_NAME=${database}, DB_USER=${user}, DB_PASSWORD=${password ? 'OK' : 'FALTA'}`,
      );
    }

    // Pool optimizado para servidor con 24GB RAM
    // ~150 conexiones máximo para no saturar PostgreSQL
    this.pool = new Pool({
      host,
      port: port || 5432,
      database,
      user,
      password,
      // Configuración de pool optimizada
      max: 50, // Máximo 50 conexiones (ajustable según carga)
      min: 10, // Mantener 10 conexiones siempre activas
      idleTimeoutMillis: 30000, // Cerrar conexiones inactivas después de 30s
      // connectionTimeoutMillis (equivalente a acquireTimeoutMillis)
      connectionTimeoutMillis: 10000, // 10s timeout para adquirir conexión
      // Optimizaciones adicionales via query params en connection string
      // SSL (desactivado por defecto, habilitar si es necesario)
      ssl:
        this.config.get<string>('DB_SSL') === 'true'
          ? { rejectUnauthorized: false }
          : false,
    });

    // Manejar errores del pool
    this.pool.on('error', (err) => {
      console.error('Error inesperado en el pool de PostgreSQL:', err);
    });

    console.log('✅ Pool de PostgreSQL inicializado');
  }

  onModuleDestroy() {
    this.pool.end();
    console.log('✅ Pool de PostgreSQL cerrado');
  }

  // Método .from() compatible con Supabase
  from<T = any>(
    table: string,
  ): QueryBuilder<T> & Promise<{ data: T[] | null; error: Error | null }> {
    const builder = new QueryBuilder<T>(table, this.pool);
    return new Proxy(builder as any, {
      get(target, prop) {
        if (prop === 'then') {
          return (resolve: any, reject: any) =>
            target.execute().then(resolve).catch(reject);
        }
        return target[prop];
      },
    });
  }

  // Insert
  insert<T = any>(table: string, data: Partial<T> | Partial<T>[]) {
    const builder = new MutationBuilder<T>(table, this.pool, 'insert');
    builder.insert(data);
    return builder;
  }

  // Update
  update<T = any>(table: string, data: Partial<T>) {
    const builder = new MutationBuilder<T>(table, this.pool, 'update');
    builder.update(data);
    return builder;
  }

  // Delete
  delete<T = any>(table: string) {
    return new MutationBuilder<T>(table, this.pool, 'delete');
  }

  // Query raw SQL
  async query<T = any>(
    sql: string,
    params?: any[],
  ): Promise<{ data: T[] | null; error: Error | null }> {
    try {
      const result = await this.pool.query(sql, params);
      return { data: result.rows, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  // Transacciones
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
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
  } {
    return {
      from: <T = any>(table: string) => this.from<T>(table),
      rpc: (name: string, params?: any) => this.callRpc(name, params),
    };
  }

  // Llamar funciones RPC (stored procedures)
  private async callRpc(
    name: string,
    params?: any,
  ): Promise<{ data: any; error: Error | null }> {
    try {
      const placeholders = params
        ? Object.keys(params)
            .map((_, i) => `$${i + 1}`)
            .join(',')
        : '';
      const values = params ? Object.values(params) : [];
      const sql = `SELECT * FROM ${name}(${placeholders})`;
      const result = await this.pool.query(sql, values);
      return { data: result.rows, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }
}
