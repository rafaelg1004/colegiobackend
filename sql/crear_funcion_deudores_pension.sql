-- ================================================================
-- FUNCION REPORTE DE PENSIONES Y DEUDORES POR MES Y AÑO EN POSTGRESQL
-- ================================================================

CREATE OR REPLACE FUNCTION fn_reporte_pensiones_deudores(p_mes INT, p_anio INT)
RETURNS TABLE (
  estudiante_id UUID,
  estudiante_nombre TEXT,
  estudiante_documento TEXT,
  grupo_id UUID,
  grado TEXT,
  acudiente_id UUID,
  acudiente_nombre TEXT,
  acudiente_documento TEXT,
  acudiente_celular TEXT,
  acudiente_correo TEXT,
  factura_id UUID,
  numero_factura TEXT,
  monto_total NUMERIC,
  monto_pagado NUMERIC,
  deuda NUMERIC,
  estado_pago TEXT,
  estado_factura TEXT,
  fecha_emision DATE,
  mes INT,
  anio INT,
  ultima_fecha_pago TIMESTAMP,
  concepto TEXT,
  estado_matricula TEXT,
  anio_lectivo_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id AS estudiante_id,
    TRIM(CONCAT(e.primer_nombre, ' ', COALESCE(e.segundo_nombre, ''), ' ', e.primer_apellido, ' ', COALESCE(e.segundo_apellido, '')))::TEXT AS estudiante_nombre,
    COALESCE(e.numero_documento, '')::TEXT AS estudiante_documento,
    g.id AS grupo_id,
    COALESCE(g.nombre, 'Sin Grupo')::TEXT AS grado,
    ac.id AS acudiente_id,
    TRIM(CONCAT(COALESCE(ac.primer_nombre, ''), ' ', COALESCE(ac.primer_apellido, '')))::TEXT AS acudiente_nombre,
    COALESCE(ac.numero_documento, '')::TEXT AS acudiente_documento,
    COALESCE(ac.celular, '')::TEXT AS acudiente_celular,
    COALESCE(ac.correo_electronico, '')::TEXT AS acudiente_correo,
    f.id AS factura_id,
    COALESCE(f.numero_factura, 'N/A')::TEXT AS numero_factura,
    COALESCE(f.total, 0)::NUMERIC AS monto_total,
    COALESCE(
      p.monto_pagado, 
      f.monto_pagado, 
      CASE WHEN f.estado = 'Pagada' THEN f.total ELSE 0 END
    )::NUMERIC AS monto_pagado,
    CASE 
      WHEN f.id IS NULL THEN 0
      WHEN f.estado = 'Pagada' THEN 0
      ELSE GREATEST(0, COALESCE(f.total, 0) - COALESCE(p.monto_pagado, f.monto_pagado, 0))
    END::NUMERIC AS deuda,
    CASE 
      WHEN f.id IS NULL THEN 'Sin Factura'
      WHEN f.estado = 'Pagada' 
           OR COALESCE(p.monto_pagado, f.monto_pagado, 0) >= COALESCE(f.total, 0) 
           OR (COALESCE(f.total, 0) > 0 AND COALESCE(p.monto_pagado, f.monto_pagado, 0) > 0)
      THEN 'Al día'
      WHEN f.estado = 'Vencida' THEN 'En mora'
      ELSE 'Debe'
    END::TEXT AS estado_pago,
    f.estado::TEXT AS estado_factura,
    f.fecha_emision::DATE,
    p_mes AS mes,
    p_anio AS anio,
    COALESCE(p.ultima_fecha_pago, f.fecha_pago)::TIMESTAMP AS ultima_fecha_pago,
    COALESCE(f.observaciones, 'Pensión')::TEXT AS concepto,
    m.estado::TEXT AS estado_matricula,
    m.anio_lectivo_id AS anio_lectivo_id
  FROM matricula m
  JOIN estudiante e ON m.estudiante_id = e.id
  LEFT JOIN grupo g ON m.grupo_id = g.id
  LEFT JOIN estudiante_acudiente ea ON e.id = ea.estudiante_id
  LEFT JOIN acudiente ac ON ea.acudiente_id = ac.id
  LEFT JOIN factura f ON e.id = f.estudiante_id 
    AND (f.estado IS NULL OR f.estado != 'Anulada')
    AND (
      EXTRACT(MONTH FROM f.fecha_emision) = p_mes 
      OR EXTRACT(MONTH FROM f.fecha_pago) = p_mes
    )
    AND (
      EXTRACT(YEAR FROM f.fecha_emision) = p_anio 
      OR EXTRACT(YEAR FROM f.fecha_pago) = p_anio
    )
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
  WHERE (m.estado IS NULL OR m.estado = 'Activa')
  ORDER BY g.nombre ASC, e.primer_apellido ASC, e.primer_nombre ASC;
END;
$$ LANGUAGE plpgsql;
