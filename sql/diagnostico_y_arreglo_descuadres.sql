-- ============================================================
-- SCRIPT DE DIAGNÓSTICO Y CORRECCIÓN DE DESCUADRES
-- Base de Datos: colegiosbinaria (PostgreSQL)
-- ============================================================

-- ------------------------------------------------------------
-- 1. DIAGNÓSTICO DE CAJA (Movimientos Anulados sumados por error)
-- ------------------------------------------------------------
SELECT 
    'Movimientos Anulados en Caja' AS diagnostico,
    id, 
    fecha, 
    tipo, 
    concepto, 
    monto, 
    estado, 
    numero_comprobante
FROM movimiento_caja
WHERE estado = 'ANULADO' OR estado = 'anulado';


-- ------------------------------------------------------------
-- 2. DIAGNÓSTICO DE CONTABILIDAD (Buscar el registro descuadrado de $100.000)
-- ------------------------------------------------------------
-- Muestra asientos de $100.000 que no tienen su contrapartida
SELECT 
    mc.id,
    mc.fecha,
    mc.descripcion,
    mc.debe,
    mc.haber,
    cc.codigo AS cuenta_codigo,
    cc.nombre AS cuenta_nombre,
    mc.movimiento_caja_id,
    mc.factura_id,
    mc.created_at
FROM movimiento_contable mc
LEFT JOIN cuenta_contable cc ON mc.cuenta_contable_id = cc.id
WHERE mc.debe = 100000 OR mc.haber = 100000
ORDER BY mc.created_at DESC;

-- Sumas generales para verificar el descuadre exacto
SELECT 
    SUM(debe) AS total_debe,
    SUM(haber) AS total_haber,
    (SUM(haber) - SUM(debe)) AS descuadre_exacto_haber_menos_debe
FROM movimiento_contable;


-- ------------------------------------------------------------
-- 3. SOLUCIÓN EN BASE DE DATOS
-- ------------------------------------------------------------

-- A) Actualizar la vista de Caja para ignorar ANULADOS
CREATE OR REPLACE VIEW vw_resumen_caja_diario AS
SELECT 
    fecha,
    COUNT(CASE WHEN tipo = 'INGRESO' THEN 1 END) as cantidad_ingresos,
    COUNT(CASE WHEN tipo = 'EGRESO' THEN 1 END) as cantidad_egresos,
    COALESCE(SUM(CASE WHEN tipo = 'INGRESO' THEN monto ELSE 0 END), 0) as total_ingresos,
    COALESCE(SUM(CASE WHEN tipo = 'EGRESO' THEN monto ELSE 0 END), 0) as total_egresos,
    COALESCE(SUM(CASE WHEN tipo = 'INGRESO' THEN monto ELSE -monto END), 0) as balance
FROM movimiento_caja
WHERE estado IS NULL OR (estado != 'ANULADO' AND estado != 'anulado')
GROUP BY fecha
ORDER BY fecha DESC;

-- C) Buscar Egresos de Caja que no se registraron en Contabilidad (causante del descuadre de $100.000)
SELECT 
    'Egreso en Caja sin registro en Contabilidad' AS tipo_hallazgo,
    mc.id,
    mc.fecha,
    mc.concepto,
    mc.monto,
    mc.numero_comprobante
FROM movimiento_caja mc
WHERE mc.tipo = 'EGRESO'
  AND (mc.estado IS NULL OR (mc.estado != 'ANULADO' AND mc.estado != 'anulado'))
  AND NOT EXISTS (
      SELECT 1 FROM movimiento_contable mco
      WHERE mco.movimiento_caja_id = mc.id
  );

-- D) Insertar en Contabilidad el Egreso de Caja faltante (Nivelar $100.000 de Gasto)
-- 1. Asiento DEBE (Gasto)
INSERT INTO movimiento_contable (
    descripcion,
    debe,
    haber,
    cuenta_contable_id,
    fecha,
    movimiento_caja_id,
    created_at
)
SELECT 
    'EGRESO CAJA: ' || mc.concepto || ' (Comp: ' || COALESCE(mc.numero_comprobante, '') || ')',
    mc.monto, -- DEBE (Gasto)
    0,
    COALESCE(
        (SELECT id FROM cuenta_contable WHERE codigo = '5105' LIMIT 1),
        (SELECT id FROM cuenta_contable WHERE codigo LIKE '5%' LIMIT 1)
    ) AS cuenta_contable_id,
    mc.fecha,
    mc.id,
    NOW()
FROM movimiento_caja mc
WHERE mc.tipo = 'EGRESO'
  AND (mc.estado IS NULL OR (mc.estado != 'ANULADO' AND mc.estado != 'anulado'))
  AND NOT EXISTS (
      SELECT 1 FROM movimiento_contable mco
      WHERE mco.movimiento_caja_id = mc.id AND mco.debe > 0
  );

-- 2. Asiento HABER (Caja/Banco)
INSERT INTO movimiento_contable (
    descripcion,
    debe,
    haber,
    cuenta_contable_id,
    fecha,
    movimiento_caja_id,
    created_at
)
SELECT 
    'EGRESO CAJA: ' || mc.concepto || ' (Comp: ' || COALESCE(mc.numero_comprobante, '') || ')',
    0,
    mc.monto, -- HABER (Salida de Caja)
    COALESCE(
        (SELECT id FROM cuenta_contable WHERE codigo = '1105' LIMIT 1),
        (SELECT id FROM cuenta_contable WHERE codigo LIKE '11%' LIMIT 1)
    ) AS cuenta_contable_id,
    mc.fecha,
    mc.id,
    NOW()
FROM movimiento_caja mc
WHERE mc.tipo = 'EGRESO'
  AND (mc.estado IS NULL OR (mc.estado != 'ANULADO' AND mc.estado != 'anulado'))
  AND NOT EXISTS (
      SELECT 1 FROM movimiento_contable mco
      WHERE mco.movimiento_caja_id = mc.id AND mco.haber > 0
  );

-- E) Verificación Final de Totales
SELECT 
    (SELECT SUM(monto) FROM movimiento_caja WHERE tipo = 'INGRESO' AND (estado IS NULL OR estado NOT IN ('ANULADO','anulado'))) AS total_ingresos_caja,
    (SELECT SUM(monto) FROM movimiento_caja WHERE tipo = 'EGRESO' AND (estado IS NULL OR estado NOT IN ('ANULADO','anulado'))) AS total_egresos_caja,
    (SELECT SUM(haber) FROM movimiento_contable mc JOIN cuenta_contable cc ON mc.cuenta_contable_id = cc.id WHERE cc.codigo LIKE '4%') AS total_ingresos_contabilidad,
    (SELECT SUM(debe) FROM movimiento_contable mc JOIN cuenta_contable cc ON mc.cuenta_contable_id = cc.id WHERE cc.codigo LIKE '5%') AS total_gastos_contabilidad;

