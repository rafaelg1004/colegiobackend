
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
    console.log("Moviendo Pensión Mensual a Inventario como Servicio...");

    // 1. Buscar el concepto de Pensión Mensual
    const conceptRes = await client.query("SELECT * FROM concepto_cobro WHERE nombre ILIKE '%pension%' OR nombre ILIKE '%pensión%'");
    if (conceptRes.rows.length === 0) {
      console.log("No se encontró el concepto de Pensión.");
      return;
    }

    const concept = conceptRes.rows[0];
    console.log(`Concepto encontrado: ${concept.nombre} (ID: ${concept.id})`);

    // 2. Crear el artículo en el inventario
    const insertArtQuery = `
      INSERT INTO articulo_inventario (
        nombre, descripcion, precio_venta, precio_unitario, 
        cantidad_stock, es_servicio, activo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    const artRes = await client.query(insertArtQuery, [
      concept.nombre,
      "Servicio de pensión mensual escolar",
      concept.valor,
      concept.valor,
      0,
      true,
      true
    ]);

    const articuloId = artRes.rows[0].id;
    console.log(`Artículo de servicio creado en inventario (ID: ${articuloId})`);

    // 3. Actualizar el concepto para que apunte al artículo y marque afecta_inventario
    await client.query(`
      UPDATE concepto_cobro 
      SET articulo_inventario_id = $1, afecta_inventario = true 
      WHERE id = $2
    `, [articuloId, concept.id]);

    console.log("Concepto actualizado y vinculado al inventario con éxito.");

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
