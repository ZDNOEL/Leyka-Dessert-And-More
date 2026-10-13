const { sql, poolPromise } = require('../db');

function formatDecimal(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function formatInteger(value, fallback = 0) {
  const numericValue = Number.parseInt(value, 10);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeProductRow(row) {
  if (!row) return row;

  return {
    ...row,
    precio: formatDecimal(row.precio),
    stock: formatInteger(row.stock),
    rating_promedio: formatDecimal(row.rating_promedio),
    total_resenas: formatInteger(row.total_resenas)
  };
}

function normalizeReviewRow(row) {
  if (!row) return row;

  return {
    ...row,
    valoracion: formatInteger(row.valoracion),
    id_usuario: formatInteger(row.id_usuario),
    id_producto: formatInteger(row.id_producto)
  };
}

function isSameSeller(req, sellerId) {
  return req.user && req.user.isSeller && Number(req.user.sellerId) === Number(sellerId);
}

function buildFinalEstado(stock, estado) {
  return stock === 0 ? 'Agotado' : (estado || 'Disponible');
}

async function productExists(pool, productId) {
  const result = await pool.request()
    .input('id_producto', sql.Int, productId)
    .query('SELECT id_producto FROM Productos WHERE id_producto = @id_producto');

  return result.recordset.length > 0;
}

exports.getAllProducts = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        p.id_producto,
        p.nombre,
        p.descripcion,
        p.precio,
        p.stock,
        CASE
          WHEN ISNULL(p.stock, 0) = 0 THEN 'Agotado'
          ELSE ISNULL(NULLIF(p.estado, ''), 'Disponible')
        END AS estado,
        p.imagen_url,
        p.categoria,
        p.fecha_registro,
        v.id_vendedor,
        v.nombre_tienda,
        u.id_usuario,
        u.whatsapp,
        CAST(ISNULL(rv.rating_promedio, 0) AS DECIMAL(10,2)) AS rating_promedio,
        ISNULL(rv.total_resenas, 0) AS total_resenas
      FROM Productos p
      JOIN Vendedores v
        ON v.id_vendedor = p.id_vendedor
      JOIN Usuarios u
        ON u.id_usuario = v.id_usuario
      LEFT JOIN (
        SELECT
          id_producto,
          AVG(CAST(valoracion AS DECIMAL(10,2))) AS rating_promedio,
          COUNT(*) AS total_resenas
        FROM ProductoResenas
        GROUP BY id_producto
      ) rv
        ON rv.id_producto = p.id_producto
      ORDER BY p.fecha_registro DESC, p.id_producto DESC
    `);

    res.json(result.recordset.map(normalizeProductRow));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSellerProducts = async (req, res) => {
  try {
    const { sellerId } = req.params;

    if (!isSameSeller(req, sellerId)) {
      return res.status(403).json({ error: 'No puedes ver productos de otro vendedor.' });
    }

    const pool = await poolPromise;
    const result = await pool.request()
      .input('id_vendedor', sql.Int, Number(sellerId))
      .query(`
        SELECT
          id_producto,
          id_vendedor,
          nombre,
          descripcion,
          precio,
          stock,
          CASE
            WHEN ISNULL(stock, 0) = 0 THEN 'Agotado'
            ELSE ISNULL(NULLIF(estado, ''), 'Disponible')
          END AS estado,
          imagen_url,
          categoria,
          fecha_registro
        FROM Productos
        WHERE id_vendedor = @id_vendedor
        ORDER BY fecha_registro DESC, id_producto DESC
      `);

    res.json(result.recordset.map(normalizeProductRow));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { sellerId } = req.params;

    if (!isSameSeller(req, sellerId)) {
      return res.status(403).json({ error: 'No puedes crear productos para otro vendedor.' });
    }

    const { nombre, descripcion, precio, stock, estado, imagen_url, categoria } = req.body;
    const finalStock = Math.max(0, formatInteger(stock));
    const finalEstado = buildFinalEstado(finalStock, estado);
    const finalPrecio = Math.max(0, formatDecimal(precio));
    const pool = await poolPromise;

    const result = await pool.request()
      .input('id_vendedor', sql.Int, Number(sellerId))
      .input('nombre', sql.VarChar(150), nombre)
      .input('descripcion', sql.VarChar(sql.MAX), descripcion || '')
      .input('precio', sql.Decimal(10, 2), finalPrecio)
      .input('stock', sql.Int, finalStock)
      .input('estado', sql.VarChar(50), finalEstado)
      .input('imagen_url', sql.VarChar(sql.MAX), imagen_url || '')
      .input('categoria', sql.VarChar(100), categoria || '')
      .query(`
        DECLARE @created TABLE (
          id_producto INT,
          id_vendedor INT,
          nombre VARCHAR(150),
          descripcion VARCHAR(MAX),
          precio DECIMAL(10,2),
          stock INT,
          estado VARCHAR(50),
          imagen_url VARCHAR(MAX),
          categoria VARCHAR(100),
          fecha_registro DATETIME
        );

        INSERT INTO Productos (
          id_vendedor,
          nombre,
          descripcion,
          precio,
          stock,
          estado,
          imagen_url,
          categoria
        )
        OUTPUT
          INSERTED.id_producto,
          INSERTED.id_vendedor,
          INSERTED.nombre,
          INSERTED.descripcion,
          INSERTED.precio,
          INSERTED.stock,
          INSERTED.estado,
          INSERTED.imagen_url,
          INSERTED.categoria,
          INSERTED.fecha_registro
        INTO @created
        VALUES (
          @id_vendedor,
          @nombre,
          @descripcion,
          @precio,
          @stock,
          @estado,
          @imagen_url,
          @categoria
        );

        SELECT *
        FROM @created;
      `);

    res.status(201).json(normalizeProductRow(result.recordset[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio, stock, estado, imagen_url, categoria } = req.body;
    const productId = Number(id);
    const sellerId = Number(req.user.sellerId);
    const finalStock = Math.max(0, formatInteger(stock));
    const finalEstado = buildFinalEstado(finalStock, estado);
    const finalPrecio = Math.max(0, formatDecimal(precio));
    const pool = await poolPromise;

    // Solo actualizar imagen_url si el cliente envio una imagen nueva
    const imagenProvided = imagen_url !== undefined && imagen_url !== null;

    const request = pool.request()
      .input('id_producto', sql.Int, productId)
      .input('id_vendedor', sql.Int, sellerId)
      .input('nombre', sql.VarChar(150), nombre)
      .input('descripcion', sql.VarChar(sql.MAX), descripcion || '')
      .input('precio', sql.Decimal(10, 2), finalPrecio)
      .input('stock', sql.Int, finalStock)
      .input('estado', sql.VarChar(50), finalEstado)
      .input('categoria', sql.VarChar(100), categoria || '');

    let imagenSetClause = '';
    if (imagenProvided) {
      request.input('imagen_url', sql.VarChar(sql.MAX), imagen_url);
      imagenSetClause = ',\n          imagen_url = @imagen_url';
    }

    const result = await request.query(`
        DECLARE @updated TABLE (
          id_producto INT,
          id_vendedor INT,
          nombre VARCHAR(150),
          descripcion VARCHAR(MAX),
          precio DECIMAL(10,2),
          stock INT,
          estado VARCHAR(50),
          imagen_url VARCHAR(MAX),
          categoria VARCHAR(100),
          fecha_registro DATETIME
        );

        UPDATE Productos
        SET
          nombre = @nombre,
          descripcion = @descripcion,
          precio = @precio,
          stock = @stock,
          estado = @estado,
          categoria = @categoria${imagenSetClause}
        OUTPUT
          INSERTED.id_producto,
          INSERTED.id_vendedor,
          INSERTED.nombre,
          INSERTED.descripcion,
          INSERTED.precio,
          INSERTED.stock,
          INSERTED.estado,
          INSERTED.imagen_url,
          INSERTED.categoria,
          INSERTED.fecha_registro
        INTO @updated
        WHERE id_producto = @id_producto
          AND id_vendedor = @id_vendedor;

        SELECT *
        FROM @updated;
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado para este vendedor.' });
    }

    res.json(normalizeProductRow(result.recordset[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id_producto', sql.Int, Number(id))
      .input('id_vendedor', sql.Int, Number(req.user.sellerId))
      .query(`
        DECLARE @deleted TABLE (
          id_producto INT
        );

        DELETE FROM Productos
        OUTPUT DELETED.id_producto INTO @deleted
        WHERE id_producto = @id_producto
          AND id_vendedor = @id_vendedor;

        SELECT *
        FROM @deleted;
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado para este vendedor.' });
    }

    res.json({
      message: 'Producto eliminado correctamente',
      id: formatInteger(result.recordset[0].id_producto)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSellerStats = async (req, res) => {
  try {
    const { sellerId } = req.params;

    if (!isSameSeller(req, sellerId)) {
      return res.status(403).json({ error: 'No puedes ver estadisticas de otro vendedor.' });
    }

    const pool = await poolPromise;
    const result = await pool.request()
      .input('id_vendedor', sql.Int, Number(sellerId))
      .query(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN ISNULL(stock, 0) > 0 THEN 1 ELSE 0 END) AS disponibles,
          SUM(CASE WHEN ISNULL(stock, 0) = 0 THEN 1 ELSE 0 END) AS agotados,
          AVG(CAST(precio AS DECIMAL(10,2))) AS precioPromedio
        FROM Productos
        WHERE id_vendedor = @id_vendedor
      `);

    const stats = result.recordset[0] || {};
    res.json({
      total: formatInteger(stats.total),
      disponibles: formatInteger(stats.disponibles),
      agotados: formatInteger(stats.agotados),
      precioPromedio: formatDecimal(stats.precioPromedio).toFixed(2)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProductReviews = async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const pool = await poolPromise;

    if (!(await productExists(pool, productId))) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    const reviewsResult = await pool.request()
      .input('id_producto', sql.Int, productId)
      .query(`
        SELECT
          r.id_resena,
          r.id_producto,
          r.id_usuario,
          r.valoracion,
          r.comentario,
          r.fecha_resena,
          r.fecha_actualizacion,
          u.nombre,
          u.foto_perfil
        FROM ProductoResenas r
        JOIN Usuarios u
          ON u.id_usuario = r.id_usuario
        WHERE r.id_producto = @id_producto
        ORDER BY r.fecha_actualizacion DESC, r.id_resena DESC
      `);

    const summaryResult = await pool.request()
      .input('id_producto', sql.Int, productId)
      .query(`
        SELECT
          CAST(ISNULL(AVG(CAST(valoracion AS DECIMAL(10,2))), 0) AS DECIMAL(10,2)) AS rating_promedio,
          COUNT(*) AS total_resenas
        FROM ProductoResenas
        WHERE id_producto = @id_producto
      `);

    const summary = summaryResult.recordset[0] || {};
    res.json({
      summary: {
        rating_promedio: formatDecimal(summary.rating_promedio),
        total_resenas: formatInteger(summary.total_resenas)
      },
      reviews: reviewsResult.recordset.map(normalizeReviewRow)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.upsertProductReview = async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const userId = Number(req.user.id);
    const valoracion = formatInteger(req.body.valoracion);
    const comentario = typeof req.body.comentario === 'string'
      ? req.body.comentario.trim()
      : '';

    if (!Number.isInteger(valoracion) || valoracion < 1 || valoracion > 5) {
      return res.status(400).json({ error: 'La valoracion debe ser un numero entre 1 y 5.' });
    }

    const pool = await poolPromise;

    if (!(await productExists(pool, productId))) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    const result = await pool.request()
      .input('id_producto', sql.Int, productId)
      .input('id_usuario', sql.Int, userId)
      .input('valoracion', sql.TinyInt, valoracion)
      .input('comentario', sql.VarChar(sql.MAX), comentario || null)
      .query(`
        IF EXISTS (
          SELECT 1
          FROM ProductoResenas
          WHERE id_producto = @id_producto
            AND id_usuario = @id_usuario
        )
        BEGIN
          UPDATE ProductoResenas
          SET
            valoracion = @valoracion,
            comentario = @comentario,
            fecha_actualizacion = GETDATE()
          WHERE id_producto = @id_producto
            AND id_usuario = @id_usuario;
        END
        ELSE
        BEGIN
          INSERT INTO ProductoResenas (
            id_producto,
            id_usuario,
            valoracion,
            comentario
          )
          VALUES (
            @id_producto,
            @id_usuario,
            @valoracion,
            @comentario
          );
        END

        SELECT TOP 1
          r.id_resena,
          r.id_producto,
          r.id_usuario,
          r.valoracion,
          r.comentario,
          r.fecha_resena,
          r.fecha_actualizacion,
          u.nombre,
          u.foto_perfil
        FROM ProductoResenas r
        JOIN Usuarios u
          ON u.id_usuario = r.id_usuario
        WHERE r.id_producto = @id_producto
          AND r.id_usuario = @id_usuario
      `);

    res.status(201).json(normalizeReviewRow(result.recordset[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
