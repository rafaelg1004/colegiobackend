import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    
    // Find constraint name
    const constraintRes = await client.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name='movimiento_contable' 
      AND constraint_type='FOREIGN KEY'
      AND constraint_name LIKE '%movimiento_caja_id%';
    `);

    if (constraintRes.rowCount && constraintRes.rowCount > 0) {
      const constraintName = constraintRes.rows[0].constraint_name;
      console.log("Dropping constraint:", constraintName);
      
      await client.query(`ALTER TABLE movimiento_contable DROP CONSTRAINT ${constraintName};`);
      
      console.log("Re-adding constraint with RESTRICT...");
      await client.query(`
        ALTER TABLE movimiento_contable 
        ADD CONSTRAINT ${constraintName} 
        FOREIGN KEY (movimiento_caja_id) REFERENCES movimiento_caja(id) ON DELETE RESTRICT;
      `);
      console.log("Candado estricto aplicado exitosamente.");
    } else {
      console.log("No constraint found to alter.");
    }

  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

run();
