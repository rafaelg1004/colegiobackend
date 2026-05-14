import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function limpiarParaPrueba() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('✅ Conectado para limpieza');

    // 1. Borrar movimientos de hoy
    const resMov = await client.query("DELETE FROM movimiento_caja WHERE created_at >= CURRENT_DATE");
    console.log(`🗑️ Movimientos eliminados: ${resMov.rowCount}`);

    // 2. Resetear facturas a Emitida
    const resFac = await client.query("UPDATE factura SET estado = 'Emitida', monto_pagado = 0, fecha_pago = NULL WHERE (fecha_pago >= CURRENT_DATE) OR (estado = 'Pagada' AND fecha_emision >= '2026-05-01')");
    console.log(`📑 Facturas devueltas a Pendiente: ${resFac.rowCount}`);

    // 3. Resetear stock a 100
    await client.query("UPDATE articulo_inventario SET cantidad_stock = 100 WHERE nombre ILIKE '%formulario%'");
    console.log('📦 Stock de formularios reseteado a 100');

    console.log('🚀 LISTO PARA TU PRUEBA MANUAL');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await client.end();
  }
}

limpiarParaPrueba();
