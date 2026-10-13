const { poolPromise } = require('./db');

async function fixColumnLengths() {
  try {
    const pool = await poolPromise;
    console.log("Fixing Usuarios table column lengths...");
    
    // Cambiar foto_perfil a VARCHAR(MAX) para soportar Base64
    await pool.request().query(`
      ALTER TABLE Usuarios ALTER COLUMN foto_perfil VARCHAR(MAX);
      PRINT 'Columna foto_perfil actualizada a VARCHAR(MAX).';
    `);

    // Opcional: Cambiar biografia a VARCHAR(MAX) también por si acaso
    await pool.request().query(`
      ALTER TABLE Usuarios ALTER COLUMN biografia VARCHAR(MAX);
      PRINT 'Columna biografia actualizada a VARCHAR(MAX).';
    `);
    
    console.log("✅ Tabla Usuarios actualizada correctamente.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

fixColumnLengths();
