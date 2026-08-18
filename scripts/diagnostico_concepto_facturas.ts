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

    console.log('--- REVISANDO FACTURAS Y DETALLES DE FACTURA ---');

    const resFact = await client.query(`
      SELECT f.id, f.numero_factura, f.observaciones, f.total, f.estado, 
             df.descripcion AS detalle_descripcion, df.articulo_id, df.concepto_cobro_id
      FROM factura f
      LEFT JOIN detalle_factura df ON df.factura_id = f.id
      ORDER BY f.created_at DESC
      LIMIT 20
    `);

    console.table(resFact.rows);

  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
