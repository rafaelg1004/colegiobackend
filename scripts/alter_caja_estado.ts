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
    
    // Add column if not exists
    const checkRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='movimiento_caja' AND column_name='estado';
    `);

    if (checkRes.rowCount === 0) {
      console.log("Adding estado to movimiento_caja...");
      await client.query(`
        ALTER TABLE movimiento_caja 
        ADD COLUMN estado VARCHAR(20) DEFAULT 'ACTIVO';
      `);
      console.log("Column 'estado' added successfully.");
    } else {
      console.log("Column 'estado' already exists.");
    }

  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

run();
