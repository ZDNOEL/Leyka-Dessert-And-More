const { poolPromise } = require('./db');

async function updateSchema() {
  try {
    const pool = await poolPromise;
    
    // Agregar whatsapp a Usuarios (para que todos lo tengan)
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Usuarios' AND COLUMN_NAME = 'whatsapp'
      )
      BEGIN
        ALTER TABLE Usuarios ADD whatsapp VARCHAR(20) NULL;
        PRINT 'Columna whatsapp agregada a Usuarios.';
      END
    `);
    
    console.log('✅ Base de datos actualizada: whatsapp ahora en Usuarios.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

updateSchema();
