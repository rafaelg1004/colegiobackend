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

    console.log('--- MATRICULAS ---');
    const resMat = await client.query('SELECT count(*) FROM matricula');
    console.log('Total matriculas:', resMat.rows[0].count);

    const resMatEst = await client.query('SELECT count(*) FROM matricula WHERE estado = \'Activa\' OR estado IS NULL');
    console.log('Total matriculas activas:', resMatEst.rows[0].count);

    console.log('\n--- FACTURAS ---');
    const resFact = await client.query(`
      SELECT id, numero_factura, estudiante_id, acudiente_id, fecha_emision, total, estado, observaciones 
      FROM factura 
      ORDER BY fecha_emision DESC 
      LIMIT 10
    `);
    console.table(resFact.rows);

    console.log('\n--- FACTURAS CON ESTUDIANTE EN MES ACTUAL ---');
    const now = new Date();
    const m = now.getMonth() + 1;
    const a = now.getFullYear();

    const resFactMes = await client.query(`
      SELECT id, numero_factura, estudiante_id, fecha_emision, total, estado 
      FROM factura 
      WHERE EXTRACT(MONTH FROM fecha_emision) = $1 AND EXTRACT(YEAR FROM fecha_emision) = $2
    `, [m, a]);
    console.log(`Facturas en mes ${m}/${a}:`, resFactMes.rows.length);
    console.table(resFactMes.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

main();
