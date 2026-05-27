import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    
    // Check if column exists
    const checkRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='movimiento_contable' AND column_name='movimiento_caja_id';
    `);

    if (checkRes.rowCount === 0) {
      console.log("Adding movimiento_caja_id to movimiento_contable...");
      await client.query(`
        ALTER TABLE movimiento_contable 
        ADD COLUMN movimiento_caja_id UUID REFERENCES movimiento_caja(id) ON DELETE SET NULL;
      `);
      console.log("Column added successfully.");
    } else {
      console.log("Column already exists.");
    }

  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

run();
