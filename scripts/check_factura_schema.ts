import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function checkCols() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    const resFac = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'factura'
    `);
    console.log('--- COLUMNAS FACTURA ---');
    console.table(resFac.rows);

    const resDet = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'factura_detalle'
    `);
    console.log('--- COLUMNAS DETALLE ---');
    console.table(resDet.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkCols();
