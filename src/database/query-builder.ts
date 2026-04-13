// Query Builder - Maneja consultas con relaciones anidadas de Supabase
import { Pool, PoolClient, QueryResult } from 'pg';

interface ParsedRelation {
  alias: string;
  fkColumn: string;
  targetTable: string;
  columns: string[];
  nested?: ParsedRelation[];
}

function tokenize(str: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let depth = 0;

  for (const char of str) {
    if (char === '(') {
      depth++;
      current += char;
    } else if (char === ')') {
      depth--;
      current += char;
    } else if (char === ',' && depth === 0) {
      tokens.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) tokens.push(current.trim());
  return tokens;
}

function parseRelation(token: string): ParsedRelation | null {
  const match = token.match(/^(\w+):(\w+)\((.*)\)$/);
  if (!match) {
    const joinMatch = token.match(/^(\w+)\((.*)\)$/);
    if (joinMatch) {
      const [, table, inner] = joinMatch;
      const innerTokens = tokenize(inner);
      const columns: string[] = [];
      let nestedRelation: ParsedRelation | null = null;

      for (const t of innerTokens) {
        if (t.includes(':')) {
          nestedRelation = parseRelation(t);
        } else {
          columns.push(t);
        }
      }

      return {
        alias: table,
        fkColumn: `${table}_id`,
        targetTable: table,
        columns: columns.length ? columns : ['*'],
        nested: nestedRelation ? [nestedRelation] : undefined,
      };
    }
    return null;
  }

  const [, alias, fkColumn, inner] = match;
  const targetTable = fkColumn.replace(/_id$/, '');
  const innerTokens = tokenize(inner);
  const columns: string[] = [];
  const nested: ParsedRelation[] = [];

  for (const t of innerTokens) {
    if (t.includes(':')) {
      const n = parseRelation(t);
      if (n) nested.push(n);
    } else {
      columns.push(t);
    }
  }

  return {
    alias,
    fkColumn,
    targetTable,
    columns: columns.length ? columns : ['*'],
    nested,
  };
}

function parseSupabaseSelect(selectStr: string): {
  mainColumns: string;
  relations: ParsedRelation[];
} {
  const relations: ParsedRelation[] = [];
  const mainCols: string[] = [];

  if (!selectStr.includes(':')) {
    return { mainColumns: selectStr, relations: [] };
  }

  const tokens: string[] = [];
  let current = '';
  let depth = 0;

  for (const char of selectStr) {
    if (char === '(') {
      depth++;
      current += char;
    } else if (char === ')') {
      depth--;
      current += char;
    } else if (char === ',' && depth === 0) {
      tokens.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) tokens.push(current.trim());

  for (const token of tokens) {
    if (token.includes(':') && token.includes('(')) {
      const parsed = parseRelation(token);
      if (parsed) relations.push(parsed);
    } else {
      mainCols.push(token);
    }
  }

  return { mainColumns: mainCols.join(', ') || '*', relations };
}

export class QueryBuilder<T = any> {
  private table: string;
  private client: Pool | PoolClient;
  private selectStr: string = '*';
  private filters: Array<{ column: string; operator: string; value: any }> = [];
  private orderBy?: { column: string; ascending: boolean };
  private limitValue?: number;
  private offsetValue?: number;
  private singleMode: boolean = false;
  private countMode: 'exact' | 'estimated' | 'planned' | null = null;
  private headOnly: boolean = false;
  private orFilters: Array<{ column: string; operator: string; value: any }> =
    [];
  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private mutationData?: Partial<T> | Partial<T>[];

  constructor(table: string, client: Pool | PoolClient) {
    this.table = table;
    this.client = client;
  }

  select(
    columns: string,
    options?: { count?: 'exact' | 'estimated' | 'planned'; head?: boolean },
  ): QueryBuilder<T> {
    this.selectStr = columns;
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

  or(condition: string): QueryBuilder<T> {
    const orConditions = condition.split(',');
    orConditions.forEach((cond) => {
      const match = cond.match(/^(.+?)\.([a-z]+)\.%(.+)%$/);
      if (match) {
        const [, column, operator, value] = match;
        if (operator === 'ilike') {
          this.orFilters.push({
            column,
            operator: 'ILIKE',
            value: `%${value}%`,
          });
        } else if (operator === 'like') {
          this.orFilters.push({
            column,
            operator: 'LIKE',
            value: `%${value}%`,
          });
        } else {
          this.orFilters.push({
            column,
            operator: operator.toUpperCase(),
            value,
          });
        }
      }
    });
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

  range(from: number, to: number): QueryBuilder<T> {
    this.offsetValue = from;
    this.limitValue = to - from + 1;
    return this;
  }

  single(): QueryBuilder<T> {
    this.singleMode = true;
    this.limit(1);
    return this;
  }

  update(data: Partial<T>): QueryBuilder<T> {
    this.operation = 'update';
    this.mutationData = data;
    return this;
  }

  insert(data: Partial<T> | Partial<T>[]): QueryBuilder<T> {
    this.operation = 'insert';
    this.mutationData = data;
    return this;
  }

  delete(): QueryBuilder<T> {
    this.operation = 'delete';
    return this;
  }

  async execute(): Promise<{
    data: T[] | null;
    error: Error | null;
    count?: number;
  }> {
    try {
      if (this.operation === 'select') {
        return await this.executeSelect();
      } else if (this.operation === 'insert') {
        return await this.executeInsert();
      } else if (this.operation === 'update') {
        return await this.executeUpdate();
      } else if (this.operation === 'delete') {
        return await this.executeDelete();
      }
      return { data: null, error: new Error('Unknown operation') };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  private async executeSelect(): Promise<{
    data: T[] | null;
    error: Error | null;
    count?: number;
  }> {
    const { mainColumns, relations } = parseSupabaseSelect(this.selectStr);

    let sql: string;
    const params: any[] = [];

    // Handle count-only queries (head: true)
    if (this.headOnly && this.countMode) {
      sql = `SELECT COUNT(*) as count FROM "${this.table}"`;
    } else if (relations.length === 0) {
      sql = `SELECT ${mainColumns} FROM "${this.table}"`;
    } else {
      sql = this.buildComplexSelect(mainColumns, relations);
    }

    let paramIndex = 1;
    const allWhereClauses: string[] = [];

    if (this.filters.length > 0) {
      const whereClauses = this.filters.map((f) => {
        if (f.operator === 'IN') {
          const placeholders = f.value.map(() => `$${paramIndex++}`).join(',');
          params.push(...f.value);
          return `"${f.column}" IN (${placeholders})`;
        } else if (f.operator === 'IS') {
          return `"${f.column}" IS ${f.value === null ? 'NULL' : 'NOT NULL'}`;
        } else {
          params.push(f.value);
          return `"${f.column}" ${f.operator} $${paramIndex++}`;
        }
      });
      allWhereClauses.push(...whereClauses);
    }

    if (this.orFilters.length > 0) {
      const orClauses = this.orFilters.map((f) => {
        params.push(f.value);
        return `"${f.column}" ${f.operator} $${paramIndex++}`;
      });
      allWhereClauses.push(`(${orClauses.join(' OR ')})`);
    }

    if (allWhereClauses.length > 0) {
      sql += ` WHERE ${allWhereClauses.join(' AND ')}`;
    }

    if (relations.length > 0) {
      sql += ` GROUP BY "${this.table}".id`;
    }

    if (this.orderBy) {
      sql += ` ORDER BY "${this.orderBy.column}" ${this.orderBy.ascending ? 'ASC' : 'DESC'}`;
    }

    if (this.limitValue) {
      sql += ` LIMIT ${this.limitValue}`;
    }
    if (this.offsetValue !== undefined) {
      sql += ` OFFSET ${this.offsetValue}`;
    }

    const result: QueryResult = await this.client.query(sql, params);

    if (this.headOnly) {
      return {
        data: null,
        error: null,
        count: parseInt(result.rows[0]?.count || '0'),
      };
    }

    return {
      data: this.singleMode ? result.rows[0] || null : result.rows,
      error: null,
      count: this.countMode
        ? parseInt(result.rows[0]?.count || '0')
        : undefined,
    };
  }

  private buildComplexSelect(
    mainColumns: string,
    relations: ParsedRelation[],
  ): string {
    const tAlias = '"' + this.table + '"';
    const selectParts: string[] = [];

    if (mainColumns === '*') {
      selectParts.push(`${tAlias}.*`);
    } else {
      mainColumns.split(',').forEach((col) => {
        selectParts.push(`${tAlias}."${col.trim()}"`);
      });
    }

    let joinIndex = 1;
    const joins: string[] = [];

    const buildRelationJson = (
      rel: ParsedRelation,
      parentAlias: string,
      idx: number,
    ): { json: string; joins: string[]; nextIdx: number } => {
      const relAlias = `t${idx}`;
      const relJoins: string[] = [];

      relJoins.push(
        `LEFT JOIN "${rel.targetTable}" ${relAlias} ON ${parentAlias}."${rel.fkColumn}" = ${relAlias}."id"`,
      );

      const colObjs: string[] = [];
      if (rel.columns.includes('*')) {
        colObjs.push(`'data'`, `row_to_json(${relAlias})`);
      } else {
        rel.columns.forEach((col) => {
          colObjs.push(`'${col}'`, `${relAlias}."${col}"`);
        });
      }

      let nextIdx = idx + 1;
      if (rel.nested && rel.nested.length > 0) {
        rel.nested.forEach((nestedRel) => {
          const nestedResult = buildRelationJson(nestedRel, relAlias, nextIdx);
          colObjs.push(`'${nestedRel.alias}'`, nestedResult.json);
          relJoins.push(...nestedResult.joins);
          nextIdx = nestedResult.nextIdx;
        });
      }

      const jsonExpr = `json_build_object(${colObjs.join(', ')})`;

      return {
        json: `COALESCE(json_agg(${jsonExpr}) FILTER (WHERE ${relAlias}.id IS NOT NULL), '[]') as ${rel.alias}`,
        joins: relJoins,
        nextIdx,
      };
    };

    relations.forEach((rel) => {
      const result = buildRelationJson(rel, tAlias, joinIndex);
      selectParts.push(result.json);
      joins.push(...result.joins);
      joinIndex = result.nextIdx;
    });

    return `SELECT ${selectParts.join(', ')} FROM ${tAlias} ${joins.join(' ')}`;
  }

  private async executeInsert(): Promise<{
    data: T[] | null;
    error: Error | null;
  }> {
    const dataArray = Array.isArray(this.mutationData)
      ? this.mutationData
      : [this.mutationData];
    if (dataArray.length === 0 || !dataArray[0]) {
      return { data: null, error: null };
    }

    const columns = Object.keys(dataArray[0]);
    let paramIndex = 1;
    const params: any[] = [];

    const placeholders = dataArray
      .map(() => `(${columns.map(() => `$${paramIndex++}`).join(',')})`)
      .join(',');

    dataArray.forEach((d) =>
      columns.forEach((c) => params.push((d as any)[c])),
    );

    const sql = `INSERT INTO "${this.table}" (${columns.map((c) => `"${c}"`).join(',')}) VALUES ${placeholders} RETURNING *`;

    const result: QueryResult = await this.client.query(sql, params);

    return {
      data: Array.isArray(this.mutationData)
        ? result.rows
        : result.rows[0] || null,
      error: null,
    };
  }

  private async executeUpdate(): Promise<{
    data: T[] | null;
    error: Error | null;
  }> {
    if (!this.mutationData) {
      return { data: null, error: new Error('No data provided for update') };
    }

    let paramIndex = 1;
    const params: any[] = [];

    const setClauses = Object.keys(this.mutationData).map((key) => {
      params.push((this.mutationData as any)[key]);
      return `"${key}" = $${paramIndex++}`;
    });

    let sql = `UPDATE "${this.table}" SET ${setClauses.join(', ')}`;

    if (this.filters.length > 0) {
      const whereClauses = this.filters.map((f) => {
        params.push(f.value);
        return `"${f.column}" ${f.operator} $${paramIndex++}`;
      });
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    sql += ` RETURNING *`;

    const result: QueryResult = await this.client.query(sql, params);

    return {
      data: this.singleMode ? result.rows[0] || null : result.rows,
      error: null,
    };
  }

  private async executeDelete(): Promise<{
    data: T[] | null;
    error: Error | null;
  }> {
    let paramIndex = 1;
    const params: any[] = [];

    let sql = `DELETE FROM "${this.table}"`;

    if (this.filters.length > 0) {
      const whereClauses = this.filters.map((f) => {
        params.push(f.value);
        return `"${f.column}" ${f.operator} $${paramIndex++}`;
      });
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    sql += ` RETURNING *`;

    const result: QueryResult = await this.client.query(sql, params);

    return { data: result.rows, error: null };
  }

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
