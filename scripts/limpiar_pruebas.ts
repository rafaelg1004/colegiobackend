
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
    console.log('--- SCRIPT DE LIMPIEZA DE DATOS DE PRUEBA (CAJA/CONTABILIDAD) ---');
    
    // El orden es importante por las llaves foráneas
    console.log('Eliminando detalles de facturas...');
    await client.query('DELETE FROM factura_detalle');
    
    console.log('Eliminando movimientos de caja...');
    await client.query('DELETE FROM movimiento_caja');

    console.log('Eliminando facturas...');
    await client.query('DELETE FROM factura');
    
    console.log('Eliminando movimientos contables...');
    await client.query('DELETE FROM movimiento_contable');
    
    console.log('Eliminando movimientos de inventario...');
    await client.query('DELETE FROM movimiento_inventario');

    // ⚠️ IMPORTANTE: NO se toca el stock (cantidad_stock) del inventario.
    // Solo se borran los movimientos (historial de entradas/salidas).

    console.log('\n✅ Base de datos de transacciones limpia.');
    console.log('Se eliminaron: facturas, movimientos de caja, asientos contables y movimientos de inventario.');
    console.log('El stock del inventario NO fue modificado.');

  } catch (err) {
    console.error('❌ Error durante la limpieza:', err);
  } finally {
    await client.end();
  }
}

main();
