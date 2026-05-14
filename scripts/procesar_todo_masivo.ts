import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function procesarTodo() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('✅ Conectado para procesamiento total');

    // 1. Obtener facturas pendientes y datos de estudiantes
    const resFac = await client.query(`
      SELECT f.id, f.numero_factura, f.total, f.estudiante_id, e.primer_nombre, e.primer_apellido 
      FROM factura f
      JOIN estudiante e ON f.estudiante_id = e.id
      WHERE f.fecha_emision >= '2026-05-01' AND f.estado = 'Emitida'
    `);
    
    const facturas = resFac.rows;
    console.log(`🚀 Procesando ${facturas.length} facturas...`);

    let contador = 0;
    for (const f of facturas) {
      const nombreEstudiante = `${f.primer_nombre} ${f.primer_apellido}`.trim();
      const numRecibo = `REC-2026-${(contador + 1).toString().padStart(6, '0')}`;
      
      // A. Actualizar Factura
      await client.query(
        "UPDATE factura SET estado = 'Pagada', monto_pagado = $1, fecha_pago = NOW() WHERE id = $2",
        [f.total, f.id]
      );

      // B. Crear Movimiento de Caja
      await client.query(`
        INSERT INTO movimiento_caja (
          tipo, concepto, monto, fecha, estudiante_id, estudiante_nombre, 
          numero_comprobante, factura_id, created_at
        ) VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, NOW())`,
        ['INGRESO', `Pago Factura ${f.numero_factura}`, f.total, f.estudiante_id, nombreEstudiante, numRecibo, f.id]
      );

      contador++;
    }

    // 2. Descontar stock total
    if (contador > 0) {
      await client.query("UPDATE articulo_inventario SET cantidad_stock = cantidad_stock - $1 WHERE nombre ILIKE '%formulario%'", [contador]);
      console.log(`📦 Inventario: -${contador} formularios`);
    }

    console.log(`✨ ¡LISTO! ${contador} transacciones completadas con éxito.`);
  } catch (err) {
    console.error('❌ Error crítico:', err);
  } finally {
    await client.end();
  }
}

procesarTodo();
