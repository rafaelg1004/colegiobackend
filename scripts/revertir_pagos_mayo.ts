import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function revertirPagos() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la DB para revertir');

    // 1. Volver facturas a Emitida
    const res = await client.query("UPDATE factura SET estado = 'Emitida', monto_pagado = 0, fecha_pago = NULL WHERE fecha_emision >= '2026-05-01' AND estado = 'Pagada' RETURNING id");
    const totalRevertidas = res.rowCount || 0;
    console.log(`📑 Facturas devueltas a PENDIENTE: ${totalRevertidas}`);

    if (totalRevertidas > 0) {
      // 2. Restaurar stock
      await client.query("UPDATE articulo_inventario SET cantidad_stock = cantidad_stock + $1 WHERE nombre ILIKE '%formulario%'", [totalRevertidas]);
      console.log(`📦 Inventario restaurado: +${totalRevertidas} unidades`);
    }

    console.log('🚀 REVERSIÓN COMPLETADA');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await client.end();
  }
}

revertirPagos();
