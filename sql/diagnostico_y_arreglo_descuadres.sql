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

-- C) Insertar la contrapartida (Débito en Caja/Banco) para nivelar los $100.000 descuadrados
-- Si existe un movimiento en el Haber de 100.000 sin contrapartida en el Debe, este comando crea la contrapartida:
INSERT INTO movimiento_contable (
    descripcion,
    debe,
    haber,
    cuenta_contable_id,
    fecha,
    factura_id,
    movimiento_caja_id,
    created_at
)
SELECT 
    'Ajuste por Nivelación de Partida Doble (Caja/Banco) - ' || mc.descripcion,
    mc.haber, -- Se asigna como Débito los 100.000
    0,
    COALESCE(
        (SELECT id FROM cuenta_contable WHERE codigo = '1105' LIMIT 1),
        (SELECT id FROM cuenta_contable WHERE codigo LIKE '11%' LIMIT 1)
    ) AS cuenta_contable_id,
    mc.fecha,
    mc.factura_id,
    mc.movimiento_caja_id,
    NOW()
FROM movimiento_contable mc
WHERE (mc.haber = 100000 AND mc.debe = 0)
  AND NOT EXISTS (
      SELECT 1 FROM movimiento_contable mc2 
      WHERE mc2.debe = 100000 
        AND (mc2.factura_id = mc.factura_id OR mc2.movimiento_caja_id = mc.movimiento_caja_id OR mc2.fecha = mc.fecha)
  );

-- D) Verificación Final de Cuadre
SELECT 
    SUM(debe) AS total_debe_final,
    SUM(haber) AS total_haber_final,
    (SUM(debe) - SUM(haber)) AS diferencia_final_debe_menos_haber
FROM movimiento_contable;
