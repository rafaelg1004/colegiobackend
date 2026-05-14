
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
    
    // 1. Crear categoría de Servicios si no existe
    console.log("Verificando categoría 'Servicios Académicos'...");
    const checkCat = await client.query("SELECT id FROM categoria_inventario WHERE nombre = 'Servicios Académicos'");
    let catId;
    if (checkCat.rows.length > 0) {
      catId = checkCat.rows[0].id;
    } else {
      const resCat = await client.query(`
        INSERT INTO categoria_inventario (nombre) 
        VALUES ('Servicios Académicos') 
        RETURNING id
      `);
      catId = resCat.rows[0].id;
    }

    // 2. Insertar los items como servicios
    const items = [
      { nombre: 'Clausura', precio: 0 },
      { nombre: 'Matricula', precio: 0 },
      { nombre: 'Derecho a Grado', precio: 0 } // Asumo que el tercero era algo similar
    ];

    console.log("Insertando items de servicios...");
    for (const item of items) {
      const checkArt = await client.query("SELECT id FROM articulo_inventario WHERE nombre = $1", [item.nombre]);
      if (checkArt.rows.length === 0) {
        await client.query(`
          INSERT INTO articulo_inventario (nombre, categoria_id, es_servicio, precio_venta, cantidad_stock, estado)
          VALUES ($1, $2, TRUE, $3, 0, 'Disponible')
        `, [item.nombre, catId, item.precio]);
      }
    }

    console.log("Servicios insertados con éxito.");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
