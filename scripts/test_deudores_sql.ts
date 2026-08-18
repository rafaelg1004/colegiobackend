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
    console.log('Testing SQL Query for getDeudores...');

    const m = 2;
    const a = 2026;

    let sql = `
      SELECT 
        e.id AS estudiante_id,
        TRIM(CONCAT(e.primer_nombre, ' ', COALESCE(e.segundo_nombre, ''), ' ', e.primer_apellido, ' ', COALESCE(e.segundo_apellido, ''))) AS estudiante_nombre,
        COALESCE(e.numero_documento, '') AS estudiante_documento,
        g.id AS grupo_id,
        COALESCE(g.nombre, 'Sin Grupo') AS grado,
        ac.id AS acudiente_id,
        TRIM(CONCAT(COALESCE(ac.primer_nombre, ''), ' ', COALESCE(ac.primer_apellido, ''))) AS acudiente_nombre,
        COALESCE(ac.numero_documento, '') AS acudiente_documento,
        COALESCE(ac.celular, '') AS acudiente_celular,
        COALESCE(ac.correo_electronico, '') AS acudiente_correo,
        f.id AS factura_id,
        f.numero_factura,
        COALESCE(f.total, 0)::numeric AS monto_total,
        COALESCE(p.monto_pagado, 0)::numeric AS monto_pagado,
        CASE 
          WHEN f.id IS NULL THEN 0
          WHEN f.estado = 'Pagada' THEN 0
          ELSE GREATEST(0, COALESCE(f.total, 0) - COALESCE(p.monto_pagado, 0))
        END::numeric AS deuda,
        CASE 
          WHEN f.id IS NULL THEN 'Sin Factura'
          WHEN f.estado = 'Pagada' OR (COALESCE(f.total, 0) > 0 AND COALESCE(p.monto_pagado, 0) >= f.total) THEN 'Al día'
          WHEN f.estado = 'Vencida' THEN 'En mora'
          ELSE 'Debe'
        END AS estado_pago,
        f.estado AS estado_factura,
        f.fecha_emision,
        p.ultima_fecha_pago,
        COALESCE(f.observaciones, 'Pensión') AS concepto
      FROM matricula m
      JOIN estudiante e ON m.estudiante_id = e.id
      LEFT JOIN grupo g ON m.grupo_id = g.id
      LEFT JOIN estudiante_acudiente ea ON e.id = ea.estudiante_id
      LEFT JOIN acudiente ac ON ea.acudiente_id = ac.id
      LEFT JOIN factura f ON e.id = f.estudiante_id 
        AND (f.estado IS NULL OR f.estado != 'Anulada') 
        AND EXTRACT(MONTH FROM f.fecha_emision) = $1 
        AND EXTRACT(YEAR FROM f.fecha_emision) = $2
        AND (
          f.observaciones ILIKE '%pens%' 
          OR EXISTS (
            SELECT 1 FROM factura_detalle df 
            WHERE df.factura_id = f.id 
              AND df.descripcion ILIKE '%pens%'
          )
        )
      LEFT JOIN (
        SELECT factura_id, SUM(monto) AS monto_pagado, MAX(fecha_pago) AS ultima_fecha_pago
        FROM pago
        GROUP BY factura_id
      ) p ON f.id = p.factura_id
      WHERE (m.estado IS NULL OR m.estado = 'Activa')
      ORDER BY g.nombre ASC, e.primer_apellido ASC, e.primer_nombre ASC
    `;

    const res = await client.query(sql, [m, a]);
    console.log('✅ Query SUCCESSFUL! Rows returned:', res.rows.length);
    console.log('Sample row:', res.rows[0]);
  } catch (err: any) {
    console.error('❌ SQL ERROR:', err.message);
    console.error('Detail:', err.detail);
    console.error('Hint:', err.hint);
  } finally {
    await client.end();
  }
}

main();
