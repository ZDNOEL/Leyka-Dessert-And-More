const { sql, poolPromise } = require('./db');

async function setupDatabase() {
  try {
    const pool = await poolPromise;
    console.log('\n🔧 Iniciando configuración de la base de datos...\n');

    // 1. Crear tabla Vendedores si no existe
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Vendedores' AND xtype='U')
      BEGIN
        CREATE TABLE Vendedores (
          id_vendedor   INT           IDENTITY(1,1) PRIMARY KEY,
          id_usuario    INT           NOT NULL UNIQUE,
          nombre_tienda VARCHAR(150)  NOT NULL,
          fecha_creacion DATETIME     DEFAULT GETDATE(),
          CONSTRAINT FK_Vendedores_Usuarios
            FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario)
            ON DELETE CASCADE
        );
        PRINT 'Tabla Vendedores creada.';
      END
    `);
    console.log('✅ Tabla Vendedores: OK');

    // 2. Crear tabla Productos si no existe
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Productos' AND xtype='U')
      BEGIN
        CREATE TABLE Productos (
          id_producto    INT           IDENTITY(1,1) PRIMARY KEY,
          id_vendedor    INT           NOT NULL,
          nombre         VARCHAR(150)  NOT NULL,
          descripcion    VARCHAR(MAX),
          precio         DECIMAL(10,2) NOT NULL,
          stock          INT           DEFAULT 0,
          estado         VARCHAR(50)   DEFAULT 'Disponible',
          imagen_url     VARCHAR(MAX),
          categoria      VARCHAR(100),
          fecha_registro DATETIME      DEFAULT GETDATE(),
          CONSTRAINT FK_Productos_Vendedores
            FOREIGN KEY (id_vendedor) REFERENCES Vendedores(id_vendedor)
            ON DELETE CASCADE
        );
        PRINT 'Tabla Productos creada.';
      END
    `);
    console.log('✅ Tabla Productos: OK');

    // 3. Asegurar que imagen_url sea VARCHAR(MAX) (por si se creó con VARCHAR(255))
    await pool.request().query(`
      IF EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'Productos'
          AND COLUMN_NAME = 'imagen_url'
          AND CHARACTER_MAXIMUM_LENGTH <> -1
      )
      BEGIN
        ALTER TABLE Productos ALTER COLUMN imagen_url VARCHAR(MAX);
        PRINT 'Columna imagen_url actualizada a VARCHAR(MAX).';
      END
    `);
    console.log('✅ Columna imagen_url (VARCHAR MAX): OK');

    // 4. Verificar todo
    const tablas = await pool.request().query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);
    console.log('\n📋 Tablas en LeykaDB:');
    tablas.recordset.forEach(t => console.log('   -', t.TABLE_NAME));

    const cols = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Productos'
      ORDER BY ORDINAL_POSITION
    `);
    console.log('\n📋 Columnas de Productos:');
    cols.recordset.forEach(c =>
      console.log(`   - ${c.COLUMN_NAME}: ${c.DATA_TYPE}${c.CHARACTER_MAXIMUM_LENGTH ? `(${c.CHARACTER_MAXIMUM_LENGTH === -1 ? 'MAX' : c.CHARACTER_MAXIMUM_LENGTH})` : ''}`)
    );

    console.log('\n🎉 Base de datos lista. Puedes guardar productos ahora.\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

setupDatabase();
