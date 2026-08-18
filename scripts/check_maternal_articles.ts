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

    console.log('=== ARTICULOS EN ARTICULO_INVENTARIO ===');
    const resArts = await client.query(`SELECT id, nombre, precio_venta, es_servicio FROM articulo_inventario;`);
    console.table(resArts.rows);

    console.log('=== CONCEPTOS EN CONCEPTO_COBRO ===');
    const resConc = await client.query(`SELECT id, nombre, valor FROM concepto_cobro;`);
    console.table(resConc.rows);

  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
