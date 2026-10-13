-- ========================
-- BASE DE DATOS LEYKADB
-- ========================
CREATE DATABASE LeykaDB;
GO
USE LeykaDB;
GO

-- ========================
-- TABLA USUARIOS
-- ========================
CREATE TABLE Usuarios (
    id_usuario INT IDENTITY(1,1) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    fecha_registro DATETIME DEFAULT GETDATE(),
    foto_perfil VARCHAR(255),
    biografia VARCHAR(300)
);

-- ========================
-- TABLA VENDEDORES (NUEVA)
-- ========================
CREATE TABLE Vendedores (
    id_vendedor INT IDENTITY(1,1) PRIMARY KEY,
    id_usuario INT NOT NULL UNIQUE,
    nombre_tienda VARCHAR(150) NOT NULL,
    fecha_creacion DATETIME DEFAULT GETDATE(),

    CONSTRAINT FK_Vendedores_Usuarios 
    FOREIGN KEY (id_usuario) 
    REFERENCES Usuarios(id_usuario)
    ON DELETE CASCADE
);

-- ========================
-- TABLA PRODUCTOS (NUEVA)
-- ========================
CREATE TABLE Productos (
    id_producto INT IDENTITY(1,1) PRIMARY KEY,
    id_vendedor INT NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion VARCHAR(MAX),
    precio DECIMAL(10,2) NOT NULL,
    stock INT DEFAULT 0,
    estado VARCHAR(50) DEFAULT 'Disponible',
    imagen_url VARCHAR(255),
    categoria VARCHAR(100),
    fecha_registro DATETIME DEFAULT GETDATE(),

    CONSTRAINT FK_Productos_Vendedores 
    FOREIGN KEY (id_vendedor) 
    REFERENCES Vendedores(id_vendedor)
    ON DELETE CASCADE
);

-- ========================
-- TABLA MARKETPLACE (Antes Publicaciones)
-- ========================
-- 1. Crear la tabla si no existe
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Marketplace')
BEGIN
    CREATE TABLE Marketplace (
        id_publicacion INT IDENTITY(1,1) PRIMARY KEY,
        id_usuario INT NOT NULL,
        contenido VARCHAR(MAX) NOT NULL,
        nombre VARCHAR(150),
        precio DECIMAL(10,2),
        stock INT DEFAULT 0,
        estado VARCHAR(50) DEFAULT 'Disponible',
        imagen_url VARCHAR(MAX),
        categoria VARCHAR(100),
        fecha_publicacion DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Marketplace_Usuarios FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario) ON DELETE CASCADE
    );
END
-- 2. Sincronizar datos iniciales
INSERT INTO Marketplace (id_usuario, contenido, nombre, precio, stock, estado, imagen_url, categoria)
SELECT v.id_usuario, p.descripcion, p.nombre, p.precio, p.stock, p.estado, p.imagen_url, p.categoria
FROM Productos p
JOIN Vendedores v ON p.id_vendedor = v.id_vendedor
WHERE NOT EXISTS (SELECT 1 FROM Marketplace m WHERE m.nombre = p.nombre);
-- 3. Trigger para actualizacion AUTOMATICA
GO
CREATE OR ALTER TRIGGER trg_SyncMarketplace
ON Productos
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    -- Actualizar registros existentes
    UPDATE m
    SET m.nombre = i.nombre,
        m.contenido = i.descripcion,
        m.precio = i.precio,
        m.stock = i.stock,
        m.estado = i.estado,
        m.imagen_url = i.imagen_url,
        m.categoria = i.categoria
    FROM Marketplace m
    JOIN Vendedores v ON m.id_usuario = v.id_usuario
    JOIN inserted i ON v.id_vendedor = i.id_vendedor;
END
GO

-- ========================
-- TABLA SESIONES
-- ========================
CREATE TABLE Sesiones (
    id_sesion INT IDENTITY(1,1) PRIMARY KEY,
    id_usuario INT NOT NULL,
    token VARCHAR(255),
    fecha_inicio DATETIME DEFAULT GETDATE(),

    CONSTRAINT FK_Sesiones_Usuarios 
    FOREIGN KEY (id_usuario) 
    REFERENCES Usuarios(id_usuario)
    ON DELETE CASCADE
);
GO

-- ========================
-- TABLA PUBLICACIONES
-- (Feed de posts/publicaciones de usuarios)
-- Columnas: id_pub, id_usuario, titulo, descripcion, imagen_url, fecha_registro
-- ========================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Publicaciones')
BEGIN
    CREATE TABLE Publicaciones (
        id_pub         INT IDENTITY(1,1) PRIMARY KEY,
        id_usuario     INT NOT NULL,
        titulo         VARCHAR(150) NOT NULL,
        descripcion    VARCHAR(MAX) NOT NULL,
        imagen_url     VARCHAR(MAX) NULL,
        fecha_registro DATETIME DEFAULT GETDATE(),

        CONSTRAINT FK_Publicaciones_Usuarios
            FOREIGN KEY (id_usuario)
            REFERENCES Usuarios(id_usuario)
            ON DELETE CASCADE
    );
END
GO

-- ========================
-- TABLA COMENTARIOS_PUB
-- (Comentarios en publicaciones del feed)
-- ========================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Comentarios_Pub')
BEGIN
    CREATE TABLE Comentarios_Pub (
        id_comentario    INT IDENTITY(1,1) PRIMARY KEY,
        id_pub           INT NOT NULL,
        id_usuario       INT NOT NULL,
        comentario       VARCHAR(MAX) NOT NULL,
        fecha_comentario DATETIME DEFAULT GETDATE(),

        CONSTRAINT FK_ComentariosPub_Publicaciones
            FOREIGN KEY (id_pub)
            REFERENCES Publicaciones(id_pub)
            ON DELETE CASCADE,

        CONSTRAINT FK_ComentariosPub_Usuarios
            FOREIGN KEY (id_usuario)
            REFERENCES Usuarios(id_usuario)
    );
END
GO

-- ========================
-- TABLA LIKES_PUB
-- (Likes en publicaciones del feed)
-- ========================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Likes_Pub')
BEGIN
    CREATE TABLE Likes_Pub (
        id_like    INT IDENTITY(1,1) PRIMARY KEY,
        id_pub     INT NOT NULL,
        id_usuario INT NOT NULL,
        fecha_like DATETIME DEFAULT GETDATE(),

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
END
GO

-- ========================
-- TABLA COMENTARIOS_MARKETPLACE
-- (Resenas y calificaciones de productos en el marketplace)
-- ========================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Comentarios_Marketplace')
BEGIN
    CREATE TABLE Comentarios_Marketplace (
        id_resena    INT IDENTITY(1,1) PRIMARY KEY,
        id_producto  INT NOT NULL,
        id_usuario   INT NOT NULL,
        calificacion INT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
        comentario   VARCHAR(MAX) NOT NULL,
        fecha_resena DATETIME DEFAULT GETDATE(),

        CONSTRAINT FK_ComentariosMkt_Productos
            FOREIGN KEY (id_producto)
            REFERENCES Marketplace(id_publicacion)
            ON DELETE CASCADE,

        CONSTRAINT FK_ComentariosMkt_Usuarios
            FOREIGN KEY (id_usuario)
            REFERENCES Usuarios(id_usuario)
    );
END
GO

-- ========================
-- TABLA CONFIRMACION_PEDIDOS
-- ========================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Confirmacion_Pedidos')
BEGIN
    CREATE TABLE Confirmacion_Pedidos (
        id_pedido INT IDENTITY(1,1) PRIMARY KEY,
        id_usuario INT NULL,
        detalles_pedido VARCHAR(MAX) NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        fecha_pedido DATETIME NOT NULL DEFAULT GETDATE(),

        CONSTRAINT FK_ConfirmacionPedidos_Usuarios
            FOREIGN KEY (id_usuario)
            REFERENCES Usuarios(id_usuario)
            ON DELETE SET NULL
    );
END
GO
