const { poolPromise } = require('./db');

async function addWhatsappColumn() {
  try {
    const pool = await poolPromise;
    
    // Verificamos si existe la columna en Vendedores
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Vendedores' AND COLUMN_NAME = 'whatsapp'
      )
      BEGIN
        ALTER TABLE Vendedores ADD whatsapp VARCHAR(20) NULL;
        PRINT 'Columna whatsapp agregada a Vendedores.';
      END
      ELSE
      BEGIN
        PRINT 'La columna whatsapp ya existe en Vendedores.';
      END
    `);
    
    console.log('✅ Base de datos actualizada con la columna whatsapp.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error actualizando BD:', err);
    process.exit(1);
  }
}

addWhatsappColumn();
