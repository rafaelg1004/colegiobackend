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

    console.log('--- EXAMINANDO TODAS LAS FACTURAS Y SUS DETALLES ---');
    const res = await client.query(`
      SELECT 
        f.id, 
        f.numero_factura, 
        f.fecha_emision, 
        f.total, 
        f.estado, 
        f.observaciones,
        fd.descripcion as detalle_descripcion
      FROM factura f
      LEFT JOIN factura_detalle fd ON fd.factura_id = f.id
      ORDER BY f.fecha_emision DESC
      LIMIT 25;
    `);

    console.table(res.rows);

  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
