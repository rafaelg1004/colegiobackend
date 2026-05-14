
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
    
    // 1. Obtener los IDs de los artículos que creamos
    const resArts = await client.query("SELECT id, nombre FROM articulo_inventario WHERE nombre IN ('Clausura', 'Matricula', 'Derecho a Grado')");
    const artsMap = resArts.rows.reduce((acc: any, curr: any) => {
      acc[curr.nombre] = curr.id;
      return acc;
    }, {});

    // 2. Obtener cuentas contables (usaré las de Servicios Académicos como base)
    const resBase = await client.query("SELECT cuenta_debito_id, cuenta_credito_id FROM concepto_cobro WHERE nombre = 'Servicios Académicos' LIMIT 1");
    const baseCuentas = resBase.rows[0] || { cuenta_debito_id: null, cuenta_credito_id: null };

    // 3. Crear los conceptos individuales
    const conceptos = [
      { nombre: 'Matricula', artId: artsMap['Matricula'] },
      { nombre: 'Clausura', artId: artsMap['Clausura'] },
      { nombre: 'Derecho a Grado', artId: artsMap['Derecho a Grado'] }
    ];

    console.log("Creando conceptos de cobro vinculados...");
    for (const c of conceptos) {
      if (!c.artId) continue;
      
      await client.query(`
        INSERT INTO concepto_cobro (nombre, valor, aplica_iva, porcentaje_iva, activo, afecta_inventario, articulo_inventario_id, tipo, cuenta_debito_id, cuenta_credito_id)
        VALUES ($1, 0, FALSE, 0, TRUE, TRUE, $2, 'INGRESO', $3, $4)
        ON CONFLICT (nombre) DO UPDATE SET articulo_inventario_id = EXCLUDED.articulo_inventario_id
      `, [c.nombre, c.artId, baseCuentas.cuenta_debito_id, baseCuentas.cuenta_credito_id]);
    }

    // 4. (Opcional) Desactivar el concepto general para no confundir
    await client.query("UPDATE concepto_cobro SET activo = FALSE WHERE nombre = 'Servicios Académicos'");

    console.log("Conceptos creados y vinculados con éxito.");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
