import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function limpiezaProfunda() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('🧹 Iniciando limpieza profunda contable...');

    // 1. Borrar pagos, movimientos de caja y contabilidad de hoy
    await client.query("DELETE FROM pago WHERE fecha_pago >= CURRENT_DATE");
    await client.query("DELETE FROM movimiento_caja WHERE created_at >= CURRENT_DATE");
    await client.query("DELETE FROM movimiento_contable WHERE fecha >= CURRENT_DATE OR created_at >= CURRENT_DATE");
    console.log('🗑️ Pagos, Caja y Contabilidad eliminados.');

    // 2. Borrar detalles y facturas de hoy
    await client.query(`
      DELETE FROM factura_detalle 
      WHERE factura_id IN (
        SELECT id FROM factura 
        WHERE created_at >= CURRENT_DATE OR fecha_emision >= '2026-05-14'
      )
    `);
    await client.query(`
      DELETE FROM factura 
      WHERE created_at >= CURRENT_DATE OR fecha_emision >= '2026-05-14'
    `);
    console.log('🗑️ Facturas eliminadas.');

    // 3. Resetear Cartera
    await client.query("UPDATE cartera SET saldo_pendiente = 15000, estado = 'Pendiente' WHERE saldo_pendiente = 0");
    console.log('💳 Cartera reseteada.');

    // 4. Resetear Stock a 100
    await client.query("UPDATE articulo_inventario SET cantidad_stock = 100 WHERE nombre ILIKE '%formulario%'");
    console.log('📦 Stock de formularios reseteado a 100.');

    console.log('✅ TABLERO TOTALMENTE LIMPIO.');
  } catch (err) {
    console.error('❌ Error en limpieza:', err);
  } finally {
    await client.end();
  }
}

limpiezaProfunda();
