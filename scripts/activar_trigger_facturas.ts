import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function activarTriggerNumeracion() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('✅ Conectado para activar Trigger de Numeración');

    // 1. Crear la función que genera el número consecutivo
    const sqlFunction = `
      CREATE OR REPLACE FUNCTION fn_generar_numero_factura() 
      RETURNS TRIGGER AS $$
      DECLARE
        ultimo_num INTEGER;
        nuevo_num_str TEXT;
      BEGIN
        -- Solo si no viene un número ya definido
        IF (NEW.numero_factura IS NULL OR NEW.numero_factura = '') THEN
          -- Buscar el número más alto del prefijo FAC-
          SELECT COALESCE(MAX(CAST(SUBSTRING(numero_factura FROM '[0-9]+$') AS INTEGER)), 0)
          INTO ultimo_num
          FROM factura
          WHERE numero_factura LIKE 'FAC-%';

          -- Generar el nuevo número con formato FAC-000001
          nuevo_num_str := 'FAC-' || LPAD((ultimo_num + 1)::TEXT, 6, '0');
          NEW.numero_factura := nuevo_num_str;
          NEW.prefijo := 'FAC';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    await client.query(sqlFunction);

    // 2. Crear el Trigger
    const sqlTrigger = `
      DROP TRIGGER IF EXISTS trg_generar_numero_factura ON factura;
      CREATE TRIGGER trg_generar_numero_factura 
      BEFORE INSERT ON factura 
      FOR EACH ROW 
      EXECUTE FUNCTION fn_generar_numero_factura();
    `;
    await client.query(sqlTrigger);

    console.log('🚀 TRIGGER DE NUMERACIÓN ACTIVADO. La base de datos ahora es la jefa de los números.');
  } catch (err) {
    console.error('❌ Error al activar Trigger:', err);
  } finally {
    await client.end();
  }
}

activarTriggerNumeracion();
