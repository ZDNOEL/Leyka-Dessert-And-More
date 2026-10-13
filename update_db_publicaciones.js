const { poolPromise } = require('./db');

async function updateSchema() {
  try {
    const pool = await poolPromise;
    console.log('\n🔧 Creando tablas de Publicaciones, Comentarios_Pub y Likes_Pub...\n');

    // 1. Crear tabla Publicaciones
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Publicaciones' AND xtype='U')
      BEGIN
        CREATE TABLE Publicaciones (
          id_pub        INT           IDENTITY(1,1) PRIMARY KEY,
          id_usuario    INT           NOT NULL,
          titulo        VARCHAR(150)  NOT NULL,
          descripcion   VARCHAR(MAX)  NOT NULL,
          imagen_url    VARCHAR(MAX),
          fecha_registro DATETIME     DEFAULT GETDATE(),
          CONSTRAINT FK_Publicaciones_Usuarios
            FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario)
            ON DELETE CASCADE
        );
        PRINT 'Tabla Publicaciones creada.';
      END
    `);
    console.log('✅ Tabla Publicaciones: OK');

    // 2. Crear tabla Comentarios_Pub
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Comentarios_Pub' AND xtype='U')
      BEGIN
        CREATE TABLE Comentarios_Pub (
          id_comentario  INT           IDENTITY(1,1) PRIMARY KEY,
          id_usuario     INT           NOT NULL,
          id_pub         INT           NOT NULL,
          comentario     VARCHAR(MAX)  NOT NULL,
          fecha_comentario DATETIME    DEFAULT GETDATE(),
          CONSTRAINT FK_ComentariosPub_Usuarios
            FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario),
          CONSTRAINT FK_ComentariosPub_Publicaciones
            FOREIGN KEY (id_pub) REFERENCES Publicaciones(id_pub)
            ON DELETE CASCADE
        );
        PRINT 'Tabla Comentarios_Pub creada.';
      END
    `);
    console.log('✅ Tabla Comentarios_Pub: OK');

    // 3. Crear tabla Likes_Pub
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Likes_Pub' AND xtype='U')
      BEGIN
        CREATE TABLE Likes_Pub (
          id_like        INT           IDENTITY(1,1) PRIMARY KEY,
          id_usuario     INT           NOT NULL,
          id_pub         INT           NOT NULL,
          CONSTRAINT FK_LikesPub_Usuarios
            FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario),
          CONSTRAINT FK_LikesPub_Publicaciones
            FOREIGN KEY (id_pub) REFERENCES Publicaciones(id_pub)
            ON DELETE CASCADE
        );
        PRINT 'Tabla Likes_Pub creada.';
      END
    `);
    console.log('✅ Tabla Likes_Pub: OK');

    console.log('\n🎉 Base de datos actualizada con éxito para las publicaciones.\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

updateSchema();
