import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const email = process.argv[2] || 'djrafael1004@gmail.com';
  const newPassword = process.argv[3] || '123456';

  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();

    // 1. Check if user exists
    const resUser = await client.query('SELECT id, email FROM users WHERE email = $1', [email]);
    
    if (resUser.rows.length === 0) {
      console.log(`❌ No se encontró usuario con el correo: ${email}`);
      return;
    }

    const userId = resUser.rows[0].id;
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 2. Update password
    await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, userId]);
    console.log(`✅ Contraseña de ${email} actualizada exitosamente a: "${newPassword}"`);

    // 3. Ensure perfil_usuario exists and is active
    const resPerfil = await client.query('SELECT id, rol, activo FROM perfil_usuario WHERE id = $1', [userId]);
    if (resPerfil.rows.length === 0) {
      await client.query('INSERT INTO perfil_usuario (id, rol, activo) VALUES ($1, $2, $3)', [userId, 'admin', true]);
      console.log(`✅ Perfil de usuario creado con rol 'admin' y activo = true`);
    } else {
      await client.query('UPDATE perfil_usuario SET activo = true WHERE id = $1', [userId]);
      console.log(`✅ Perfil de usuario activo verificado. Rol actual: ${resPerfil.rows[0].rol}`);
    }

  } catch (err) {
    console.error('❌ Error actualizando usuario:', err);
  } finally {
    await client.end();
  }
}

main();
