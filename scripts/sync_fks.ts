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
    
    // 1. Sincronizar movimiento_caja_id
    const cajaUpdate = await client.query(`
      UPDATE movimiento_contable mc
      SET movimiento_caja_id = m_caja.id
      FROM movimiento_caja m_caja
      WHERE mc.descripcion LIKE '%(Ref: ' || m_caja.numero_comprobante || ')%'
      AND mc.movimiento_caja_id IS NULL;
    `);
    console.log("Updated movimiento_caja_id in", cajaUpdate.rowCount, "rows");

    // 2. Sincronizar factura_id
    const facturaUpdate = await client.query(`
      UPDATE movimiento_contable mc
      SET factura_id = f.id
      FROM factura f
      WHERE mc.descripcion LIKE '%Factura ' || f.numero_factura || '%'
      AND mc.factura_id IS NULL;
    `);
    console.log("Updated factura_id in", facturaUpdate.rowCount, "rows");

  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

run();
