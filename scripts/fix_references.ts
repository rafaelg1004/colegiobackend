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
    
    // Let's preview what we are going to update
    const previewRes = await client.query(`
      SELECT mc.id, mc.descripcion as old_desc, 
             REPLACE(mc.descripcion, '(Ref: ' || m_caja.id::text || ')', '(Ref: ' || m_caja.numero_comprobante || ')') as new_desc
      FROM movimiento_contable mc
      JOIN movimiento_caja m_caja ON mc.descripcion LIKE '%(Ref: ' || m_caja.id::text || ')%'
      LIMIT 5;
    `);
    console.log("Preview:", previewRes.rows);

    // Run the update
    const updateRes = await client.query(`
      UPDATE movimiento_contable mc
      SET descripcion = REPLACE(mc.descripcion, '(Ref: ' || m_caja.id::text || ')', '(Ref: ' || m_caja.numero_comprobante || ')')
      FROM movimiento_caja m_caja
      WHERE mc.descripcion LIKE '%(Ref: ' || m_caja.id::text || ')%';
    `);
    
    console.log("Updated rows:", updateRes.rowCount);

  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

run();
