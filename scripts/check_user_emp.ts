
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
    const res = await client.query(`
      SELECT p.id, p.empleado_id, u.email 
      FROM perfil_usuario p
      JOIN users u ON p.id = u.id
      WHERE u.email = 'djrafael1004@gmail.com'
    `);
    console.table(res.rows);
    
    if (res.rows[0]?.empleado_id) {
        const resEmp = await client.query("SELECT id FROM empleado WHERE id = $1", [res.rows[0].empleado_id]);
        console.log("¿Existe en empleado?", resEmp.rows.length > 0);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
