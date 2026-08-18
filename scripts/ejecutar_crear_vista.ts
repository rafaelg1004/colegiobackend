import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('🔗 Conectado a PostgreSQL:', process.env.DB_HOST);

    const sqlFile = path.join(__dirname, '../sql/crear_vista_deudores_pension.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    await client.query(sql);
    console.log('✅ Vista vw_reporte_pensiones_deudores CREADA EXITOSAMENTE en PostgreSQL!');
  } catch (err: any) {
    console.error('❌ Error creando la vista en PostgreSQL:', err.message);
  } finally {
    await client.end();
  }
}

main();
