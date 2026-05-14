
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
    console.log('Connected to database');

    // 1. Alter table (just in case)
    await client.query(`
      ALTER TABLE concepto_cobro 
      ADD COLUMN IF NOT EXISTS tipo VARCHAR(10) DEFAULT 'INGRESO' CHECK (tipo IN ('INGRESO', 'EGRESO')),
      ADD COLUMN IF NOT EXISTS cuenta_debito_id UUID REFERENCES cuenta_contable(id),
      ADD COLUMN IF NOT EXISTS cuenta_credito_id UUID REFERENCES cuenta_contable(id);
    `);

    // 2. Get accounts for mapping
    const { rows: accounts } = await client.query('SELECT id, codigo FROM cuenta_contable');
    const accMap = accounts.reduce((map: any, acc: any) => {
      map[acc.codigo] = acc.id;
      return map;
    }, {});

    const mappings = [
      // INGRESOS
      { nombre: 'Matrícula', tipo: 'INGRESO', debito: '1105', credito: '4105' },
      { nombre: 'Pensión Mensual', tipo: 'INGRESO', debito: '1105', credito: '4115' },
      { nombre: 'Meriendas', tipo: 'INGRESO', debito: '1105', credito: '4130' },
      { nombre: 'Libros', tipo: 'INGRESO', debito: '1105', credito: '4140' },
      { nombre: 'Formularios', tipo: 'INGRESO', debito: '1105', credito: '4110' },
      { nombre: 'Derecho a Grado', tipo: 'INGRESO', debito: '1105', credito: '4120' },
      { nombre: 'Clausura/Graduación', tipo: 'INGRESO', debito: '1105', credito: '4125' },
      { nombre: 'Uniformes', tipo: 'INGRESO', debito: '1105', credito: '4140' },
      { nombre: 'Otro Ingreso', tipo: 'INGRESO', debito: '1105', credito: '4140' },
      
      // EGRESOS
      { nombre: 'Nómina Docentes', tipo: 'EGRESO', debito: '5105', credito: '1105' },
      { nombre: 'Nómina Administrativos', tipo: 'EGRESO', debito: '5105', credito: '1105' },
      { nombre: 'Arriendo', tipo: 'EGRESO', debito: '5110', credito: '1105' },
      { nombre: 'Servicios Públicos', tipo: 'EGRESO', debito: '5115', credito: '1105' },
      { nombre: 'Suministros Oficina', tipo: 'EGRESO', debito: '5230', credito: '1105' },
      { nombre: 'Mantenimiento', tipo: 'EGRESO', debito: '5225', credito: '1105' },
      { nombre: 'Implementos de Aseo', tipo: 'EGRESO', debito: '5200', credito: '1105' },
      { nombre: 'Material Didáctico', tipo: 'EGRESO', debito: '5205', credito: '1105' },
      { nombre: 'Transporte', tipo: 'EGRESO', debito: '5215', credito: '1105' },
      { nombre: 'Otro Gasto', tipo: 'EGRESO', debito: '5220', credito: '1105' },
    ];

    console.log('Upserting concepts and associations...');
    for (const m of mappings) {
      const debitoId = accMap[m.debito];
      const creditoId = accMap[m.credito];

      if (!debitoId || !creditoId) {
        console.warn(`Skipping ${m.nombre}: accounts not found (${m.debito} or ${m.credito})`);
        continue;
      }

      // Check if exists by name
      const { rows: existing } = await client.query('SELECT id FROM concepto_cobro WHERE nombre = $1', [m.nombre]);
      
      if (existing.length > 0) {
        await client.query(
          'UPDATE concepto_cobro SET tipo = $1, cuenta_debito_id = $2, cuenta_credito_id = $3 WHERE id = $4',
          [m.tipo, debitoId, creditoId, existing[0].id]
        );
        console.log(`Updated: ${m.nombre}`);
      } else {
        await client.query(
          'INSERT INTO concepto_cobro (nombre, tipo, cuenta_debito_id, cuenta_credito_id, valor, aplica_iva, porcentaje_iva, activo) VALUES ($1, $2, $3, $4, 0, false, 0, true)',
          [m.nombre, m.tipo, debitoId, creditoId]
        );
        console.log(`Inserted: ${m.nombre}`);
      }
    }

    console.log('Setup completed successfully');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

main();
