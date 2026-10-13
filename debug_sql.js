const { poolPromise } = require('./db');

async function debugSQL() {
  const pool = await poolPromise;
  
  try {
    console.log('--- Step 1 ---');
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
          CONSTRAINT FK_Pub_Usuarios
            FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario)
            ON DELETE CASCADE
        );
      END
    `);
    console.log('Step 1 success');
  } catch(e) {
    console.error('Step 1 Error:', e);
  }

  try {
    console.log('--- Step 2 ---');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Comentarios_Pub' AND xtype='U')
      BEGIN
        CREATE TABLE Comentarios_Pub (
          id_comentario  INT           IDENTITY(1,1) PRIMARY KEY,
          id_usuario     INT           NOT NULL,
          id_pub         INT           NOT NULL,
          comentario     VARCHAR(MAX)  NOT NULL,
          fecha_comentario DATETIME    DEFAULT GETDATE(),
          CONSTRAINT FK_ComPub_Usuarios
            FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario),
          CONSTRAINT FK_ComPub_Publicaciones
            FOREIGN KEY (id_pub) REFERENCES Publicaciones(id_pub)
            ON DELETE CASCADE
        );
      END
    `);
    console.log('Step 2 success');
  } catch(e) {
    console.error('Step 2 Error:', e);
  }

  try {
    console.log('--- Step 3 ---');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Likes_Pub' AND xtype='U')
      BEGIN
        CREATE TABLE Likes_Pub (
          id_like        INT           IDENTITY(1,1) PRIMARY KEY,
          id_usuario     INT           NOT NULL,
          id_pub         INT           NOT NULL,
          CONSTRAINT FK_LikPub_Usuarios
            FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario),
          CONSTRAINT FK_LikPub_Publicaciones
            FOREIGN KEY (id_pub) REFERENCES Publicaciones(id_pub)
            ON DELETE CASCADE
        );
      END
    `);
    console.log('Step 3 success');
  } catch(e) {
    console.error('Step 3 Error:', e);
  }

  process.exit();
}

debugSQL();
