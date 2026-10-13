const { sql, poolPromise } = require('./db');

async function testInsert() {
  try {
    const pool = await poolPromise;
    // Create a 1MB string
    const largeString = 'a'.repeat(1024 * 1024);
    const result = await pool.request()
      .input('id_vendedor', sql.Int, 1) // assuming 1 exists
      .input('nombre', sql.VarChar, 'Test Large Image')
      .input('descripcion', sql.VarChar, '')
      .input('precio', sql.Decimal(10, 2), 10.50)
      .input('stock', sql.Int, 5)
      .input('estado', sql.VarChar, 'Disponible')
      .input('imagen_url', sql.VarChar(sql.MAX), largeString)
      .input('categoria', sql.VarChar, 'Pasteles')
      .query(`
        INSERT INTO Productos (id_vendedor, nombre, descripcion, precio, stock, estado, imagen_url, categoria)
        OUTPUT INSERTED.*
        VALUES (@id_vendedor, @nombre, @descripcion, @precio, @stock, @estado, @imagen_url, @categoria)
      `);
    console.log('Inserted successfully with large string.');
    process.exit(0);
  } catch (err) {
    console.error('Error in query:', err.message);
    process.exit(1);
  }
}
testInsert();
