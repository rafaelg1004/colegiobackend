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

    console.log('=== 1. VERIFICANDO TABLA FACTURA (ULTIMAS 20) ===');
    const resFacturas = await client.query(`
      SELECT f.id, f.numero_factura, f.estudiante_id, f.fecha_emision, f.total, f.estado, f.observaciones,
             e.primer_nombre, e.primer_apellido
      FROM factura f
      LEFT JOIN estudiante e ON f.estudiante_id = e.id
      ORDER BY f.fecha_emision DESC
      LIMIT 20;
    `);
    console.table(resFacturas.rows);

    console.log('=== 2. VERIFICANDO TABLA FACTURA_DETALLE ===');
    const resDetalles = await client.query(`
      SELECT fd.id, fd.factura_id, fd.descripcion, fd.articulo_inventario_id, fd.concepto_cobro_id, fd.subtotal
      FROM factura_detalle fd
      LIMIT 20;
    `);
    console.table(resDetalles.rows);

    console.log('=== 3. VERIFICANDO TABLA PAGO ===');
    const resPagos = await client.query(`
      SELECT p.* FROM pago p LIMIT 20;
    `);
    console.table(resPagos.rows);

    console.log('=== 4. VERIFICANDO TABLAS DE CAJA / TRANSACCIONES ===');
    const resTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND (table_name LIKE '%pago%' OR table_name LIKE '%caja%' OR table_name LIKE '%recibo%' OR table_name LIKE '%movimiento%' OR table_name LIKE '%ingreso%');
    `);
    console.table(resTables.rows);

    // Si existe caja_movimiento o movimiento_caja
    for (const t of resTables.rows) {
      try {
        const sample = await client.query(`SELECT * FROM ${t.table_name} LIMIT 5;`);
        console.log(`--- Muestra de tabla ${t.table_name} ---`);
        console.table(sample.rows);
      } catch (e: any) {
        // ignore
      }
    }

  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
