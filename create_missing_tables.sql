-- ================================================
-- SCRIPT: Tablas que faltan en LeykaDB
-- Ejecutar en SQL Server Management Studio
-- Base de datos: LeykaDB
-- ================================================
USE LeykaDB;
GO

-- ========================
-- TABLA PUBLICACIONES
-- (Feed de posts de usuarios)
-- Columnas: id_pub, id_usuario, titulo, descripcion, imagen_url, fecha_registro
-- ========================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Publicaciones')
BEGIN
    CREATE TABLE Publicaciones (
        id_pub        INT IDENTITY(1,1) PRIMARY KEY,
        id_usuario    INT NOT NULL,
        titulo        VARCHAR(150) NOT NULL,
        descripcion   VARCHAR(MAX) NOT NULL,
        imagen_url    VARCHAR(MAX) NULL,        -- URL de la imagen del post
        fecha_registro DATETIME DEFAULT GETDATE(),

        CONSTRAINT FK_Publicaciones_Usuarios
            FOREIGN KEY (id_usuario)
            REFERENCES Usuarios(id_usuario)
            ON DELETE CASCADE
    );
    PRINT 'Tabla Publicaciones creada correctamente.';
END
ELSE
BEGIN
    PRINT 'La tabla Publicaciones ya existe.';
END
GO

-- ========================
-- TABLA COMENTARIOS_PUB
-- (Comentarios en publicaciones del feed)
-- ========================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Comentarios_Pub')
BEGIN
    CREATE TABLE Comentarios_Pub (
        id_comentario   INT IDENTITY(1,1) PRIMARY KEY,
        id_pub          INT NOT NULL,
        id_usuario      INT NOT NULL,
        comentario      VARCHAR(MAX) NOT NULL,
        fecha_comentario DATETIME DEFAULT GETDATE(),

        CONSTRAINT FK_ComentariosPub_Publicaciones
            FOREIGN KEY (id_pub)
            REFERENCES Publicaciones(id_pub)
            ON DELETE CASCADE,

        CONSTRAINT FK_ComentariosPub_Usuarios
            FOREIGN KEY (id_usuario)
            REFERENCES Usuarios(id_usuario)
    );
    PRINT 'Tabla Comentarios_Pub creada correctamente.';
END
ELSE
BEGIN
    PRINT 'La tabla Comentarios_Pub ya existe.';
END
GO

-- ========================
-- TABLA LIKES_PUB
-- (Likes en publicaciones del feed)
-- ========================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Likes_Pub')
BEGIN
    CREATE TABLE Likes_Pub (
        id_like     INT IDENTITY(1,1) PRIMARY KEY,
        id_pub      INT NOT NULL,
        id_usuario  INT NOT NULL,
        fecha_like  DATETIME DEFAULT GETDATE(),

        -- Un usuario solo puede dar like una vez por publicacion
        CONSTRAINT UQ_LikesPub_UsuarioPub UNIQUE (id_usuario, id_pub),

        CONSTRAINT FK_LikesPub_Publicaciones
            FOREIGN KEY (id_pub)
            REFERENCES Publicaciones(id_pub)
            ON DELETE CASCADE,

        CONSTRAINT FK_LikesPub_Usuarios
            FOREIGN KEY (id_usuario)
            REFERENCES Usuarios(id_usuario)
    );
    PRINT 'Tabla Likes_Pub creada correctamente.';
END
ELSE
BEGIN
    PRINT 'La tabla Likes_Pub ya existe.';
END
GO

-- ========================
-- TABLA COMENTARIOS_MARKETPLACE
-- (Resenas/comentarios de productos en el marketplace)
-- ========================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Comentarios_Marketplace')
BEGIN
    CREATE TABLE Comentarios_Marketplace (
        id_resena      INT IDENTITY(1,1) PRIMARY KEY,
        id_producto    INT NOT NULL,        -- id del producto del marketplace
        id_usuario     INT NOT NULL,
        calificacion   INT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
        comentario     VARCHAR(MAX) NOT NULL,
        fecha_resena   DATETIME DEFAULT GETDATE(),

        CONSTRAINT FK_ComentariosMkt_Productos
            FOREIGN KEY (id_producto)
            REFERENCES Marketplace(id_publicacion)
            ON DELETE CASCADE,

        CONSTRAINT FK_ComentariosMkt_Usuarios
            FOREIGN KEY (id_usuario)
            REFERENCES Usuarios(id_usuario)
    );
    PRINT 'Tabla Comentarios_Marketplace creada correctamente.';
END
ELSE
BEGIN
    PRINT 'La tabla Comentarios_Marketplace ya existe.';
END
GO

PRINT '=== SCRIPT COMPLETADO ===';
