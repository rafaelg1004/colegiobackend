-- ================================================
-- Tabla: movimiento_caja
-- Contabilidad simplificada para colegio pequeño
-- ================================================

-- Crear tabla
CREATE TABLE IF NOT EXISTS movimiento_caja (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('INGRESO', 'EGRESO')),
    concepto VARCHAR(100) NOT NULL,
    monto DECIMAL(12, 2) NOT NULL CHECK (monto > 0),
    estudiante_id UUID REFERENCES estudiante(id) ON DELETE SET NULL,
    estudiante_nombre VARCHAR(200),
    observacion TEXT,
    registrado_por UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_movimiento_caja_fecha ON movimiento_caja(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_movimiento_caja_tipo ON movimiento_caja(tipo);
CREATE INDEX IF NOT EXISTS idx_movimiento_caja_concepto ON movimiento_caja(concepto);

-- Políticas RLS (Row Level Security)
ALTER TABLE movimiento_caja ENABLE ROW LEVEL SECURITY;

-- Política: usuarios autenticados pueden ver todos los movimientos
CREATE POLICY "Usuarios autenticados pueden ver movimientos"
    ON movimiento_caja FOR SELECT
    TO authenticated
    USING (true);

-- Política: usuarios autenticados pueden crear movimientos
CREATE POLICY "Usuarios autenticados pueden crear movimientos"
    ON movimiento_caja FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Política: solo admin puede eliminar movimientos
CREATE POLICY "Solo admin puede eliminar movimientos"
    ON movimiento_caja FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM perfil_usuario 
            WHERE id = auth.uid() 
            AND rol = 'ADMIN'
        )
    );

-- Vista: resumen diario
CREATE OR REPLACE VIEW vw_resumen_caja_diario AS
SELECT 
    fecha,
    COUNT(CASE WHEN tipo = 'INGRESO' THEN 1 END) as cantidad_ingresos,
    COUNT(CASE WHEN tipo = 'EGRESO' THEN 1 END) as cantidad_egresos,
    COALESCE(SUM(CASE WHEN tipo = 'INGRESO' THEN monto ELSE 0 END), 0) as total_ingresos,
    COALESCE(SUM(CASE WHEN tipo = 'EGRESO' THEN monto ELSE 0 END), 0) as total_egresos,
    COALESCE(SUM(CASE WHEN tipo = 'INGRESO' THEN monto ELSE -monto END), 0) as balance
FROM movimiento_caja
GROUP BY fecha
ORDER BY fecha DESC;

-- Vista: resumen por concepto
CREATE OR REPLACE VIEW vw_resumen_caja_concepto AS
SELECT 
    tipo,
    concepto,
    COUNT(*) as cantidad,
    SUM(monto) as total_monto
FROM movimiento_caja
GROUP BY tipo, concepto
ORDER BY tipo, total_monto DESC;

-- Función: obtener balance actual
CREATE OR REPLACE FUNCTION fn_balance_caja(
    fecha_desde DATE DEFAULT NULL,
    fecha_hasta DATE DEFAULT NULL
)
RETURNS TABLE (
    total_ingresos DECIMAL,
    total_egresos DECIMAL,
    balance DECIMAL,
    cantidad_ingresos BIGINT,
    cantidad_egresos BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN tipo = 'INGRESO' THEN monto ELSE 0 END), 0) as total_ingresos,
        COALESCE(SUM(CASE WHEN tipo = 'EGRESO' THEN monto ELSE 0 END), 0) as total_egresos,
        COALESCE(SUM(CASE WHEN tipo = 'INGRESO' THEN monto ELSE -monto END), 0) as balance,
        COUNT(CASE WHEN tipo = 'INGRESO' THEN 1 END) as cantidad_ingresos,
        COUNT(CASE WHEN tipo = 'EGRESO' THEN 1 END) as cantidad_egresos
    FROM movimiento_caja
    WHERE (fecha_desde IS NULL OR fecha >= fecha_desde)
      AND (fecha_hasta IS NULL OR fecha <= fecha_hasta);
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- Datos de ejemplo (opcional - quitar comentarios si se desea)
-- ================================================
/*
INSERT INTO movimiento_caja (fecha, tipo, concepto, monto, observacion) VALUES
('2025-04-01', 'INGRESO', 'Matrícula', 150000, 'Matrícula estudiante nuevo'),
('2025-04-01', 'INGRESO', 'Pensión Mensual', 85000, 'Pensión abril'),
('2025-04-02', 'INGRESO', 'Meriendas', 25000, 'Pago meriendas semana'),
('2025-04-02', 'EGRESO', 'Nómina Docentes', 1200000, 'Pago quincena docentes'),
('2025-04-03', 'INGRESO', 'Libros', 45000, 'Venta libro de texto'),
('2025-04-03', 'EGRESO', 'Servicios Públicos', 180000, 'Recibo energía abril'),
('2025-04-04', 'INGRESO', 'Uniformes', 65000, 'Venta uniforme completo'),
('2025-04-05', 'EGRESO', 'Suministros Oficina', 45000, 'Papel, tinta, etc.');
*/
