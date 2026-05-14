
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
    console.log("Corrigiendo Pensión Mensual (Usando 'Disponible')...");

    // 1. Buscar la categoría de "Servicios Académicos"
    const catRes = await client.query("SELECT id FROM categoria_inventario WHERE nombre ILIKE '%servicios%' OR nombre ILIKE '%academico%' LIMIT 1");
    const categoriaId = catRes.rows[0]?.id;

    if (!categoriaId) {
      console.log("No se encontró la categoría de Servicios Académicos.");
      return;
    }

    // 2. Buscar o Crear el artículo de Pensión
    const artCheck = await client.query("SELECT id FROM articulo_inventario WHERE nombre ILIKE '%pension%'");
    
    let articuloId;
    if (artCheck.rows.length > 0) {
      articuloId = artCheck.rows[0].id;
      await client.query("UPDATE articulo_inventario SET categoria_id = $1, es_servicio = true, estado = 'Disponible' WHERE id = $2", [categoriaId, articuloId]);
      console.log(`Artículo actualizado (ID: ${articuloId})`);
    } else {
      const insRes = await client.query(
        "INSERT INTO articulo_inventario (nombre, precio_venta, precio_unitario, es_servicio, estado, categoria_id, cantidad_stock) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
        ["Pensión Mensual", 0, 0, true, 'Disponible', categoriaId, 0]
      );
      articuloId = insRes.rows[0].id;
      console.log(`Artículo creado (ID: ${articuloId})`);
    }

    // 3. DESACTIVAR el concepto de Pensión
    await client.query("UPDATE concepto_cobro SET activo = false WHERE nombre ILIKE '%pension%'");
    console.log("Concepto de Pensión desactivado.");

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
