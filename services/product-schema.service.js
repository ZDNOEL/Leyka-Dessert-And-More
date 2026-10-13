const { poolPromise } = require('../db');

let ensurePromise = null;

async function runQuery(pool, query) {
  await pool.request().query(query);
}

async function ensureProductInfrastructure() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      const pool = await poolPromise;

      await runQuery(pool, `
        IF NOT EXISTS (SELECT 1 FROM sysobjects WHERE name = 'Productos' AND xtype = 'U')
        BEGIN
          CREATE TABLE Productos (
            id_producto INT IDENTITY(1,1) PRIMARY KEY,
            id_vendedor INT NOT NULL,
            nombre VARCHAR(150) NOT NULL,
            descripcion VARCHAR(MAX) NULL,
            precio DECIMAL(10,2) NOT NULL,
            stock INT NOT NULL DEFAULT 0,
            estado VARCHAR(50) NOT NULL DEFAULT 'Disponible',
            imagen_url VARCHAR(MAX) NULL,
            categoria VARCHAR(100) NULL,
            fecha_registro DATETIME NOT NULL DEFAULT GETDATE(),
            CONSTRAINT FK_Productos_Vendedores
              FOREIGN KEY (id_vendedor) REFERENCES Vendedores(id_vendedor)
              ON DELETE CASCADE
          );
        END
      `);

      await runQuery(pool, `
        IF NOT EXISTS (SELECT 1 FROM sysobjects WHERE name = 'Confirmacion_Pedidos' AND xtype = 'U')
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
      `);

      await runQuery(pool, `
        IF NOT EXISTS (SELECT 1 FROM sysobjects WHERE name = 'Marketplace' AND xtype = 'U')
        BEGIN
          CREATE TABLE Marketplace (
            id_publicacion INT IDENTITY(1,1) PRIMARY KEY,
            id_usuario INT NOT NULL,
            id_producto INT NULL,
            contenido VARCHAR(MAX) NOT NULL DEFAULT '',
            fecha_publicacion DATETIME NOT NULL DEFAULT GETDATE(),
            nombre VARCHAR(150) NULL,
            precio DECIMAL(10,2) NULL,
            stock INT NOT NULL DEFAULT 0,
            estado VARCHAR(50) NOT NULL DEFAULT 'Disponible',
            imagen_url VARCHAR(MAX) NULL,
            categoria VARCHAR(100) NULL,
            CONSTRAINT FK_Marketplace_Usuarios
              FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario)
              ON DELETE CASCADE
          );
        END
      `);

      await runQuery(pool, `
        IF COL_LENGTH('Marketplace', 'id_producto') IS NULL
        BEGIN
          ALTER TABLE Marketplace ADD id_producto INT NULL;
        END
      `);

      await runQuery(pool, `
        IF OBJECT_ID('trg_SyncMarketplace', 'TR') IS NOT NULL
        BEGIN
          DROP TRIGGER trg_SyncMarketplace;
        END
      `);

      await runQuery(pool, `
        IF EXISTS (
          SELECT 1
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = 'Productos'
            AND COLUMN_NAME = 'imagen_url'
            AND CHARACTER_MAXIMUM_LENGTH <> -1
        )
        BEGIN
          ALTER TABLE Productos ALTER COLUMN imagen_url VARCHAR(MAX) NULL;
        END
      `);

      await runQuery(pool, `
        IF EXISTS (SELECT 1 FROM Marketplace WHERE id_producto IS NULL)
        BEGIN
          ;WITH exact_matches AS (
            SELECT
              m.id_publicacion,
              p.id_producto,
              ROW_NUMBER() OVER (
                PARTITION BY m.id_publicacion
                ORDER BY ABS(DATEDIFF(SECOND, p.fecha_registro, m.fecha_publicacion)), p.id_producto DESC
              ) AS rn_marketplace,
              ROW_NUMBER() OVER (
                PARTITION BY p.id_producto
                ORDER BY ABS(DATEDIFF(SECOND, p.fecha_registro, m.fecha_publicacion)), m.id_publicacion DESC
              ) AS rn_producto
            FROM Marketplace m
            JOIN Vendedores v
              ON v.id_usuario = m.id_usuario
            JOIN Productos p
              ON p.id_vendedor = v.id_vendedor
             AND ISNULL(p.nombre, '') = ISNULL(m.nombre, '')
             AND ISNULL(p.categoria, '') = ISNULL(m.categoria, '')
            WHERE m.id_producto IS NULL
          )
          UPDATE m
          SET m.id_producto = x.id_producto
          FROM Marketplace m
          JOIN exact_matches x
            ON x.id_publicacion = m.id_publicacion
           AND x.rn_marketplace = 1
           AND x.rn_producto = 1;

          ;WITH dated_matches AS (
            SELECT
              m.id_publicacion,
              p.id_producto,
              ROW_NUMBER() OVER (
                PARTITION BY m.id_publicacion
                ORDER BY ABS(DATEDIFF(SECOND, p.fecha_registro, m.fecha_publicacion)), p.id_producto DESC
              ) AS rn_marketplace,
              ROW_NUMBER() OVER (
                PARTITION BY p.id_producto
                ORDER BY ABS(DATEDIFF(SECOND, p.fecha_registro, m.fecha_publicacion)), m.id_publicacion DESC
              ) AS rn_producto
            FROM Marketplace m
            JOIN Vendedores v
              ON v.id_usuario = m.id_usuario
            JOIN Productos p
              ON p.id_vendedor = v.id_vendedor
            WHERE m.id_producto IS NULL
              AND ABS(DATEDIFF(SECOND, p.fecha_registro, m.fecha_publicacion)) <= 5
          )
          UPDATE m
          SET m.id_producto = x.id_producto
          FROM Marketplace m
          JOIN dated_matches x
            ON x.id_publicacion = m.id_publicacion
           AND x.rn_marketplace = 1
           AND x.rn_producto = 1;

          UPDATE p
          SET
            p.nombre = ISNULL(m.nombre, p.nombre),
            p.descripcion = ISNULL(m.contenido, ''),
            p.precio = ISNULL(m.precio, p.precio),
            p.stock = ISNULL(m.stock, p.stock),
            p.estado = CASE
              WHEN ISNULL(m.stock, p.stock) = 0 THEN 'Agotado'
              ELSE ISNULL(NULLIF(m.estado, ''), 'Disponible')
            END,
            p.imagen_url = ISNULL(m.imagen_url, ''),
            p.categoria = ISNULL(m.categoria, '')
          FROM Productos p
          JOIN Marketplace m
            ON m.id_producto = p.id_producto;

          INSERT INTO Productos (
            id_vendedor,
            nombre,
            descripcion,
            precio,
            stock,
            estado,
            imagen_url,
            categoria,
            fecha_registro
          )
          SELECT
            v.id_vendedor,
            ISNULL(m.nombre, 'Producto sin nombre'),
            ISNULL(m.contenido, ''),
            ISNULL(m.precio, 0),
            ISNULL(m.stock, 0),
            CASE
              WHEN ISNULL(m.stock, 0) = 0 THEN 'Agotado'
              ELSE ISNULL(NULLIF(m.estado, ''), 'Disponible')
            END,
            ISNULL(m.imagen_url, ''),
            ISNULL(m.categoria, ''),
            ISNULL(m.fecha_publicacion, GETDATE())
          FROM Marketplace m
          JOIN Vendedores v
            ON v.id_usuario = m.id_usuario
          WHERE m.id_producto IS NULL;

          ;WITH exact_matches AS (
            SELECT
              m.id_publicacion,
              p.id_producto,
              ROW_NUMBER() OVER (
                PARTITION BY m.id_publicacion
                ORDER BY ABS(DATEDIFF(SECOND, p.fecha_registro, m.fecha_publicacion)), p.id_producto DESC
              ) AS rn_marketplace,
              ROW_NUMBER() OVER (
                PARTITION BY p.id_producto
                ORDER BY ABS(DATEDIFF(SECOND, p.fecha_registro, m.fecha_publicacion)), m.id_publicacion DESC
              ) AS rn_producto
            FROM Marketplace m
            JOIN Vendedores v
              ON v.id_usuario = m.id_usuario
            JOIN Productos p
              ON p.id_vendedor = v.id_vendedor
             AND ISNULL(p.nombre, '') = ISNULL(m.nombre, '')
             AND ISNULL(p.categoria, '') = ISNULL(m.categoria, '')
             AND ABS(DATEDIFF(SECOND, p.fecha_registro, m.fecha_publicacion)) <= 5
            WHERE m.id_producto IS NULL
          )
          UPDATE m
          SET m.id_producto = x.id_producto
          FROM Marketplace m
          JOIN exact_matches x
            ON x.id_publicacion = m.id_publicacion
           AND x.rn_marketplace = 1
           AND x.rn_producto = 1;
        END
      `);

      await runQuery(pool, `
        INSERT INTO Marketplace (
          id_usuario,
          id_producto,
          contenido,
          fecha_publicacion,
          nombre,
          precio,
          stock,
          estado,
          imagen_url,
          categoria
        )
        SELECT
          v.id_usuario,
          p.id_producto,
          ISNULL(p.descripcion, ''),
          p.fecha_registro,
          p.nombre,
          p.precio,
          ISNULL(p.stock, 0),
          CASE
            WHEN ISNULL(p.stock, 0) = 0 THEN 'Agotado'
            ELSE ISNULL(NULLIF(p.estado, ''), 'Disponible')
          END,
          ISNULL(p.imagen_url, ''),
          ISNULL(p.categoria, '')
        FROM Productos p
        JOIN Vendedores v
          ON v.id_vendedor = p.id_vendedor
        LEFT JOIN Marketplace m
          ON m.id_producto = p.id_producto
        WHERE m.id_publicacion IS NULL
      `);

      await runQuery(pool, `
        UPDATE m
        SET
          m.id_usuario = v.id_usuario,
          m.contenido = ISNULL(p.descripcion, ''),
          m.nombre = p.nombre,
          m.precio = p.precio,
          m.stock = ISNULL(p.stock, 0),
          m.estado = CASE
            WHEN ISNULL(p.stock, 0) = 0 THEN 'Agotado'
            ELSE ISNULL(NULLIF(p.estado, ''), 'Disponible')
          END,
          m.imagen_url = ISNULL(p.imagen_url, ''),
          m.categoria = ISNULL(p.categoria, '')
        FROM Marketplace m
        JOIN Productos p
          ON p.id_producto = m.id_producto
        JOIN Vendedores v
          ON v.id_vendedor = p.id_vendedor
      `);

      await runQuery(pool, `
        IF NOT EXISTS (
          SELECT 1
          FROM sys.indexes
          WHERE name = 'UX_Marketplace_IdProducto'
            AND object_id = OBJECT_ID('Marketplace')
        )
        BEGIN
          CREATE UNIQUE INDEX UX_Marketplace_IdProducto
          ON Marketplace (id_producto)
          WHERE id_producto IS NOT NULL;
        END
      `);

      await runQuery(pool, `
        IF NOT EXISTS (SELECT 1 FROM sysobjects WHERE name = 'ProductoResenas' AND xtype = 'U')
        BEGIN
          CREATE TABLE ProductoResenas (
            id_resena INT IDENTITY(1,1) PRIMARY KEY,
            id_producto INT NOT NULL,
            id_usuario INT NOT NULL,
            valoracion TINYINT NOT NULL,
            comentario VARCHAR(MAX) NULL,
            fecha_resena DATETIME NOT NULL DEFAULT GETDATE(),
            fecha_actualizacion DATETIME NOT NULL DEFAULT GETDATE(),
            CONSTRAINT FK_ProductoResenas_Productos
              FOREIGN KEY (id_producto) REFERENCES Productos(id_producto)
              ON DELETE CASCADE,
            CONSTRAINT FK_ProductoResenas_Usuarios
              FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario)
              ON DELETE CASCADE,
            CONSTRAINT CK_ProductoResenas_Valoracion
              CHECK (valoracion BETWEEN 1 AND 5),
            CONSTRAINT UQ_ProductoResenas_ProductoUsuario
              UNIQUE (id_producto, id_usuario)
          );
        END
      `);

      await runQuery(pool, `
        CREATE OR ALTER TRIGGER trg_SyncMarketplaceFromProductos
        ON Productos
        AFTER INSERT, UPDATE, DELETE
        AS
        BEGIN
          SET NOCOUNT ON;

          DELETE m
          FROM Marketplace m
          JOIN deleted d
            ON d.id_producto = m.id_producto
          LEFT JOIN inserted i
            ON i.id_producto = d.id_producto
          WHERE i.id_producto IS NULL;

          UPDATE m
          SET
            m.id_usuario = v.id_usuario,
            m.contenido = ISNULL(i.descripcion, ''),
            m.nombre = i.nombre,
            m.precio = i.precio,
            m.stock = ISNULL(i.stock, 0),
            m.estado = CASE
              WHEN ISNULL(i.stock, 0) = 0 THEN 'Agotado'
              ELSE ISNULL(NULLIF(i.estado, ''), 'Disponible')
            END,
            m.imagen_url = ISNULL(i.imagen_url, ''),
            m.categoria = ISNULL(i.categoria, '')
          FROM Marketplace m
          JOIN inserted i
            ON i.id_producto = m.id_producto
          JOIN Vendedores v
            ON v.id_vendedor = i.id_vendedor;

          INSERT INTO Marketplace (
            id_usuario,
            id_producto,
            contenido,
            fecha_publicacion,
            nombre,
            precio,
            stock,
            estado,
            imagen_url,
            categoria
          )
          SELECT
            v.id_usuario,
            i.id_producto,
            ISNULL(i.descripcion, ''),
            i.fecha_registro,
            i.nombre,
            i.precio,
            ISNULL(i.stock, 0),
            CASE
              WHEN ISNULL(i.stock, 0) = 0 THEN 'Agotado'
              ELSE ISNULL(NULLIF(i.estado, ''), 'Disponible')
            END,
            ISNULL(i.imagen_url, ''),
            ISNULL(i.categoria, '')
          FROM inserted i
          JOIN Vendedores v
            ON v.id_vendedor = i.id_vendedor
          LEFT JOIN Marketplace m
            ON m.id_producto = i.id_producto
          WHERE m.id_publicacion IS NULL;
        END
      `);
    })().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  return ensurePromise;
}

module.exports = {
  ensureProductInfrastructure
};
