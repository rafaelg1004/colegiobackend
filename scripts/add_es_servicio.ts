
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
    console.log("Añadiendo columna es_servicio a articulo_inventario...");
    await client.query("ALTER TABLE articulo_inventario ADD COLUMN IF NOT EXISTS es_servicio BOOLEAN DEFAULT FALSE");
    console.log("Columna añadida con éxito.");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
