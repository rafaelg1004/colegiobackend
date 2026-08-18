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

    console.log('--- REVISANDO FACTURAS Y DETALLES EN BASE DE DATOS ---');
    const resFacturas = await client.query(`
      SELECT f.id, f.numero_factura, f.estudiante_id, f.fecha_emision, f.total, f.estado, f.observaciones,
             fd.id AS detalle_id, fd.descripcion, fd.articulo_inventario_id, fd.concepto_cobro_id, fd.subtotal
      FROM factura f
      LEFT JOIN factura_detalle fd ON f.id = fd.factura_id
      ORDER BY f.fecha_emision DESC
      LIMIT 30;
    `);

    console.table(resFacturas.rows);

    console.log('--- REVISANDO PAGOS REGISTRADOS ---');
    const resPagos = await client.query(`
      SELECT p.id, p.factura_id, p.monto, p.fecha_pago, p.metodo_pago
      FROM pago p
      ORDER BY p.fecha_pago DESC
      LIMIT 20;
    `);

    console.table(resPagos.rows);

  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
