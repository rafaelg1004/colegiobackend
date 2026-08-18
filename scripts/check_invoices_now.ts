import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

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
    console.log('--- RESUMEN DE FACTURAS EXISTENTES ---');

    const resMonths = await client.query(`
      SELECT 
        EXTRACT(MONTH FROM fecha_emision) as mes,
        EXTRACT(YEAR FROM fecha_emision) as anio,
        estado,
        COUNT(*) as cantidad,
        SUM(total) as total_monto
      FROM factura
      GROUP BY mes, anio, estado
      ORDER BY anio DESC, mes DESC
    `);
    console.table(resMonths.rows);

  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
