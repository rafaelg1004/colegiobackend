import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function corregirIds() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('✅ Conectado para corregir IDs');

    // 1. Vincular facturas al ID de producto que sí tiene stock
    const res = await client.query("UPDATE factura_detalle SET articulo_inventario_id = '43554725-0d06-4ac1-bf99-66dbb200ed1d' WHERE descripcion ILIKE '%formulario%'");
    console.log(`📑 Detalles de factura actualizados: ${res.rowCount}`);

    console.log('🚀 LISTO. Ahora el inventario descontará correctamente.');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await client.end();
  }
}

corregirIds();
