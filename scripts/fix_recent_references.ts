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
    
    // We will do a looser join without comparing dates
    // For 'EGRESO: Transporte - YENIS HERNANDEZ', monto = 8000
    const preview = await client.query(`
      SELECT mc.id, mc.descripcion, m_caja.numero_comprobante, m_caja.id as caja_id
      FROM movimiento_contable mc
      JOIN movimiento_caja m_caja 
        ON mc.haber + mc.debe = m_caja.monto
      WHERE mc.descripcion = 'EGRESO: Transporte - YENIS HERNANDEZ'
      AND m_caja.concepto = 'Transporte'
      AND m_caja.monto = 8000
      LIMIT 10;
    `);
    
    console.log("Matches to update:", preview.rows);

    const updateRes = await client.query(`
      UPDATE movimiento_contable mc
      SET descripcion = mc.descripcion || ' (Ref: ' || m_caja.numero_comprobante || ')',
          movimiento_caja_id = m_caja.id
      FROM movimiento_caja m_caja
      WHERE mc.haber + mc.debe = m_caja.monto
       AND mc.descripcion = 'EGRESO: Transporte - YENIS HERNANDEZ'
       AND m_caja.concepto = 'Transporte'
       AND m_caja.monto = 8000
    `);

    console.log("Updated rows:", updateRes.rowCount);

  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

run();
