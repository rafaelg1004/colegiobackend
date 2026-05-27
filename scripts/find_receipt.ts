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
    console.log('Connected to DB');
    
    // Add empleado_id column
    const query = `
      ALTER TABLE movimiento_caja 
      ADD COLUMN IF NOT EXISTS empleado_id UUID REFERENCES empleado(id);
    `;
    await client.query(query);
    console.log('Added empleado_id column to movimiento_caja');
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

run();
