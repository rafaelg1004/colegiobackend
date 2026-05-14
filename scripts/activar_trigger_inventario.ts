import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function activarTrigger() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('✅ Conectado para activar Trigger');

    // 1. Crear la función del Trigger
    const sqlFunction = `
      CREATE OR REPLACE FUNCTION fn_descontar_inventario_pago() 
      RETURNS TRIGGER AS $$
      DECLARE
        r_detalle RECORD;
      BEGIN
        -- Solo si es un INGRESO con factura asociada
        IF (NEW.tipo = 'INGRESO' AND NEW.factura_id IS NOT NULL) THEN
          FOR r_detalle IN 
            SELECT articulo_inventario_id, cantidad 
            FROM factura_detalle 
            WHERE factura_id = NEW.factura_id 
            AND articulo_inventario_id IS NOT NULL 
          LOOP
            -- Descontar del inventario
            UPDATE articulo_inventario 
            SET cantidad_stock = cantidad_stock - r_detalle.cantidad 
            WHERE id = r_detalle.articulo_inventario_id;
          END LOOP;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    await client.query(sqlFunction);

    // 2. Crear el Trigger
    const sqlTrigger = `
      DROP TRIGGER IF EXISTS trg_descontar_inventario_caja ON movimiento_caja;
      CREATE TRIGGER trg_descontar_inventario_caja 
      AFTER INSERT ON movimiento_caja 
      FOR EACH ROW 
      EXECUTE FUNCTION fn_descontar_inventario_pago();
    `;
    await client.query(sqlTrigger);

    console.log('🚀 TRIGGER ACTIVADO: La base de datos ahora descuenta el stock automáticamente.');
  } catch (err) {
    console.error('❌ Error al activar Trigger:', err);
  } finally {
    await client.end();
  }
}

activarTrigger();
