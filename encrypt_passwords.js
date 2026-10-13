const { sql, poolPromise } = require('./db.js');
const bcrypt = require('bcrypt');

async function run() {
  try {
    const pool = await poolPromise;
    console.log("Fetching users with plain text passwords...");
    
    // Asumimos que las contraseñas planas no empiezan con $2b$ (el prefijo de bcrypt)
    const result = await pool.request().query("SELECT id_usuario, password_hash FROM Usuarios WHERE password_hash NOT LIKE '$2b$%'");
    const users = result.recordset;
    
    if (users.length === 0) {
      console.log("No plain text passwords found. All passwords are encrypted.");
      process.exit(0);
    }
    
    console.log(`Found ${users.length} users to encrypt.`);
    
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      for (const user of users) {
        const hashedPassword = await bcrypt.hash(user.password_hash, 10);
        await transaction.request()
          .input('id_usuario', sql.Int, user.id_usuario)
          .input('password_hash', sql.VarChar(255), hashedPassword)
          .query('UPDATE Usuarios SET password_hash = @password_hash WHERE id_usuario = @id_usuario');
      }
      await transaction.commit();
      console.log("Success: Encrypted all plain text passwords.");
    } catch (txError) {
      await transaction.rollback();
      throw txError;
    }
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
