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

    console.log('=== TODOS LOS ARTICULOS DE INVENTARIO Y SERVICIOS ===');
    const resArts = await client.query(`SELECT id, nombre, precio_venta, es_servicio FROM articulo_inventario ORDER BY nombre;`);
    console.table(resArts.rows);

  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
