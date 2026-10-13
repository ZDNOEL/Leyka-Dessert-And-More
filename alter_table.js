const { sql, poolPromise } = require('./db');

async function alterTable() {
  try {
    const pool = await poolPromise;
    await pool.request().query('ALTER TABLE Productos ALTER COLUMN imagen_url VARCHAR(MAX)');
    console.log('Table altered successfully.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
alterTable();
