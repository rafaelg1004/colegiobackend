import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function procesarPagos() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la DB');

    // 1. Obtener facturas pendientes de Mayo
    const res = await client.query("UPDATE factura SET estado = 'Pagada', monto_pagado = 15000, fecha_pago = NOW() WHERE fecha_emision >= '2026-05-01' AND estado = 'Emitida' RETURNING id");
    const totalPagadas = res.rowCount || 0;
    console.log(`📑 Facturas marcadas como PAGADAS: ${totalPagadas}`);

    if (totalPagadas > 0) {
      // 2. Descontar stock
      await client.query("UPDATE articulo_inventario SET cantidad_stock = cantidad_stock - $1 WHERE nombre ILIKE '%formulario%'", [totalPagadas]);
      console.log(`📦 Inventario descontado: ${totalPagadas} unidades`);
    }

    console.log('🚀 PROCESO COMPLETADO EXITOSAMENTE');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await client.end();
  }
}

procesarPagos();
