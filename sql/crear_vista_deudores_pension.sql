-- ================================================
-- VISTA DE CONTROL DE PENSIONES Y DEUDORES POR ACUDIENTE
-- ================================================

CREATE OR REPLACE VIEW vw_reporte_pensiones_deudores AS
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
  COALESCE(
    p.monto_pagado, 
    f.monto_pagado, 
    CASE WHEN f.estado = 'Pagada' THEN f.total ELSE 0 END
  )::numeric AS monto_pagado,
  CASE 
    WHEN f.id IS NULL THEN 0
    WHEN f.estado = 'Pagada' THEN 0
    ELSE GREATEST(0, COALESCE(f.total, 0) - COALESCE(p.monto_pagado, f.monto_pagado, 0))
  END::numeric AS deuda,
  CASE 
    WHEN f.id IS NULL THEN 'Sin Factura'
    WHEN f.estado = 'Pagada' 
         OR COALESCE(p.monto_pagado, f.monto_pagado, 0) >= COALESCE(f.total, 0) 
         OR (COALESCE(f.total, 0) > 0 AND COALESCE(p.monto_pagado, f.monto_pagado, 0) > 0)
    THEN 'Al día'
    WHEN f.estado = 'Vencida' THEN 'En mora'
    ELSE 'Debe'
  END AS estado_pago,
  f.estado AS estado_factura,
  f.fecha_emision,
  COALESCE(
    EXTRACT(MONTH FROM p.ultima_fecha_pago)::int,
    EXTRACT(MONTH FROM f.fecha_pago)::int,
    EXTRACT(MONTH FROM f.fecha_emision)::int,
    EXTRACT(MONTH FROM CURRENT_DATE)::int
  ) AS mes,
  COALESCE(
    EXTRACT(YEAR FROM p.ultima_fecha_pago)::int,
    EXTRACT(YEAR FROM f.fecha_pago)::int,
    EXTRACT(YEAR FROM f.fecha_emision)::int,
    EXTRACT(YEAR FROM CURRENT_DATE)::int
  ) AS anio,
  COALESCE(p.ultima_fecha_pago, f.fecha_pago) AS ultima_fecha_pago,
  COALESCE(f.observaciones, 'Pensión') AS concepto,
  m.estado AS estado_matricula,
  m.anio_lectivo_id
FROM matricula m
JOIN estudiante e ON m.estudiante_id = e.id
LEFT JOIN grupo g ON m.grupo_id = g.id
LEFT JOIN estudiante_acudiente ea ON e.id = ea.estudiante_id
LEFT JOIN acudiente ac ON ea.acudiente_id = ac.id
LEFT JOIN factura f ON e.id = f.estudiante_id 
  AND (f.estado IS NULL OR f.estado != 'Anulada')
  AND (
    f.observaciones ILIKE '%pensi%'
    OR EXISTS (
      SELECT 1 FROM factura_detalle df 
      LEFT JOIN articulo_inventario ai ON df.articulo_inventario_id = ai.id
      LEFT JOIN concepto_cobro cc ON df.concepto_cobro_id = cc.id
      WHERE df.factura_id = f.id 
        AND (
          df.descripcion ILIKE '%pensi%' 
          OR ai.nombre ILIKE '%pensi%'
          OR cc.nombre ILIKE '%pensi%'
        )
    )
  )
LEFT JOIN (
  SELECT 
    pago_inner.factura_id,
    SUM(pago_inner.monto) AS monto_pagado, 
    MAX(pago_inner.fecha_pago) AS ultima_fecha_pago
  FROM pago pago_inner
  GROUP BY pago_inner.factura_id
) p ON f.id = p.factura_id
WHERE (m.estado IS NULL OR m.estado = 'Activa');
