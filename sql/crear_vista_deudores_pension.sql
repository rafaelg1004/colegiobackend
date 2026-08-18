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
  COALESCE(p.monto_pagado, 0)::numeric AS monto_pagado,
  CASE 
    WHEN f.id IS NULL AND p.monto_pagado IS NULL THEN 0
    WHEN f.estado = 'Pagada' OR COALESCE(p.monto_pagado, 0) >= COALESCE(f.total, 0) THEN 0
    ELSE GREATEST(0, COALESCE(f.total, 0) - COALESCE(p.monto_pagado, 0))
  END::numeric AS deuda,
  CASE 
    WHEN COALESCE(p.monto_pagado, 0) > 0 OR f.estado = 'Pagada' THEN 'Al día'
    WHEN f.id IS NOT NULL AND f.estado = 'Vencida' THEN 'En mora'
    WHEN f.id IS NOT NULL THEN 'Debe'
    ELSE 'Sin Factura'
  END AS estado_pago,
  f.estado AS estado_factura,
  f.fecha_emision,
  CASE 
    WHEN f.observaciones ILIKE '%enero%' OR EXISTS (SELECT 1 FROM factura_detalle df WHERE df.factura_id = f.id AND df.descripcion ILIKE '%enero%') THEN 1
    WHEN f.observaciones ILIKE '%febrero%' OR EXISTS (SELECT 1 FROM factura_detalle df WHERE df.factura_id = f.id AND df.descripcion ILIKE '%febrero%') THEN 2
    WHEN f.observaciones ILIKE '%marzo%' OR EXISTS (SELECT 1 FROM factura_detalle df WHERE df.factura_id = f.id AND df.descripcion ILIKE '%marzo%') THEN 3
    WHEN f.observaciones ILIKE '%abril%' OR EXISTS (SELECT 1 FROM factura_detalle df WHERE df.factura_id = f.id AND df.descripcion ILIKE '%abril%') THEN 4
    WHEN f.observaciones ILIKE '%mayo%' OR EXISTS (SELECT 1 FROM factura_detalle df WHERE df.factura_id = f.id AND df.descripcion ILIKE '%mayo%') THEN 5
    WHEN f.observaciones ILIKE '%junio%' OR EXISTS (SELECT 1 FROM factura_detalle df WHERE df.factura_id = f.id AND df.descripcion ILIKE '%junio%') THEN 6
    WHEN f.observaciones ILIKE '%julio%' OR EXISTS (SELECT 1 FROM factura_detalle df WHERE df.factura_id = f.id AND df.descripcion ILIKE '%julio%') THEN 7
    WHEN f.observaciones ILIKE '%agosto%' OR EXISTS (SELECT 1 FROM factura_detalle df WHERE df.factura_id = f.id AND df.descripcion ILIKE '%agosto%') THEN 8
    WHEN f.observaciones ILIKE '%septiembre%' OR EXISTS (SELECT 1 FROM factura_detalle df WHERE df.factura_id = f.id AND df.descripcion ILIKE '%septiembre%') THEN 9
    WHEN f.observaciones ILIKE '%octubre%' OR EXISTS (SELECT 1 FROM factura_detalle df WHERE df.factura_id = f.id AND df.descripcion ILIKE '%octubre%') THEN 10
    WHEN f.observaciones ILIKE '%noviembre%' OR EXISTS (SELECT 1 FROM factura_detalle df WHERE df.factura_id = f.id AND df.descripcion ILIKE '%noviembre%') THEN 11
    WHEN f.observaciones ILIKE '%diciembre%' OR EXISTS (SELECT 1 FROM factura_detalle df WHERE df.factura_id = f.id AND df.descripcion ILIKE '%diciembre%') THEN 12
    ELSE COALESCE(EXTRACT(MONTH FROM f.fecha_emision)::int, EXTRACT(MONTH FROM p.ultima_fecha_pago)::int)
  END AS mes,
  COALESCE(EXTRACT(YEAR FROM p.ultima_fecha_pago)::int, EXTRACT(YEAR FROM f.fecha_emision)::int) AS anio,
  p.ultima_fecha_pago,
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
    (f.observaciones IS NULL OR (f.observaciones NOT ILIKE '%formulario%' AND f.observaciones NOT ILIKE '%uniforme%'))
    AND NOT EXISTS (
      SELECT 1 FROM factura_detalle df 
      WHERE df.factura_id = f.id 
        AND (df.descripcion ILIKE '%formulario%' OR df.descripcion ILIKE '%uniforme%')
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
