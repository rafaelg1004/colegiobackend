
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
    
    console.log("--- COLUMNAS DE 'factura' ---");
    const resCols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'factura' ORDER BY ordinal_position");
    console.table(resCols.rows);

    console.log("\n--- CONSTRAINTS DE 'factura' ---");
    const resCons = await client.query(`
      SELECT conname, pg_get_constraintdef(c.oid) 
      FROM pg_constraint c 
      JOIN pg_namespace n ON n.oid = c.connamespace 
      WHERE conrelid = 'factura'::regclass
    `);
    console.table(resCons.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
