const { sql, poolPromise } = require('./db');

async function testInsert() {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id_vendedor', sql.Int, 1) // assuming 1 exists
      .input('nombre', sql.VarChar, 'Test Product')
      .input('descripcion', sql.VarChar, '')
      .input('precio', sql.Decimal(10, 2), 10.50)
      .input('stock', sql.Int, 5)
      .input('estado', sql.VarChar, 'Disponible')
      .input('imagen_url', sql.VarChar(sql.MAX), 'test_base64_string')
      .input('categoria', sql.VarChar, 'Pasteles')
      .query(`
        INSERT INTO Productos (id_vendedor, nombre, descripcion, precio, stock, estado, imagen_url, categoria)
        OUTPUT INSERTED.*
        VALUES (@id_vendedor, @nombre, @descripcion, @precio, @stock, @estado, @imagen_url, @categoria)
      `);
    console.log(result.recordset);
    process.exit(0);
  } catch (err) {
    console.error('Error in query:', err.message);
    process.exit(1);
  }
}
testInsert();
