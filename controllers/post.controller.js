const { sql, poolPromise } = require('../db');

exports.getAllPosts = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`
        SELECT p.id_publicacion as id_marketplace, p.contenido, p.fecha_publicacion, 
               p.nombre, p.precio, p.stock, p.estado, p.imagen_url, p.categoria,
               u.id_usuario, u.nombre as nombre_usuario, u.foto_perfil,
               v.nombre_tienda, v.whatsapp
        FROM Marketplace p
        JOIN Usuarios u ON p.id_usuario = u.id_usuario
        LEFT JOIN Vendedores v ON u.id_usuario = v.id_usuario
        ORDER BY p.fecha_publicacion DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSellerPosts = async (req, res) => {
  try {
    const { sellerId } = req.params; // Note: this is id_vendedor, but we need id_usuario
    const pool = await poolPromise;
    
    // First get id_usuario from sellerId
    const seller = await pool.request()
      .input('id_vendedor', sql.Int, sellerId)
      .query('SELECT id_usuario FROM Vendedores WHERE id_vendedor = @id_vendedor');
    
    if (!seller.recordset[0]) return res.status(404).json({ error: 'Vendedor no encontrado' });
    const id_usuario = seller.recordset[0].id_usuario;

    const result = await pool.request()
      .input('id_usuario', sql.Int, id_usuario)
      .query(`
        SELECT * FROM Marketplace 
        WHERE id_usuario = @id_usuario 
        ORDER BY fecha_publicacion DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createPost = async (req, res) => {
  try {
    const { id_usuario, contenido, nombre, precio, stock, estado, imagen_url, categoria } = req.body;
    const pool = await poolPromise;
    
    const finalEstado = (parseInt(stock) === 0) ? 'Agotado' : (estado || 'Disponible');

    const result = await pool.request()
      .input('id_usuario', sql.Int, id_usuario)
      .input('contenido', sql.VarChar(sql.MAX), contenido)
      .input('nombre', sql.VarChar(150), nombre || '')
      .input('precio', sql.Decimal(10, 2), precio || 0)
      .input('stock', sql.Int, stock || 0)
      .input('estado', sql.VarChar(50), finalEstado)
      .input('imagen_url', sql.VarChar(sql.MAX), imagen_url || '')
      .input('categoria', sql.VarChar(100), categoria || '')
      .query(`
        INSERT INTO Marketplace (id_usuario, contenido, nombre, precio, stock, estado, imagen_url, categoria)
        OUTPUT INSERTED.*
        VALUES (@id_usuario, @contenido, @nombre, @precio, @stock, @estado, @imagen_url, @categoria)
      `);
      
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { contenido, nombre, precio, stock, estado, imagen_url, categoria } = req.body;
    const pool = await poolPromise;
    
    const finalEstado = (parseInt(stock) === 0) ? 'Agotado' : (estado || 'Disponible');

    const result = await pool.request()
      .input('id_marketplace', sql.Int, id)
      .input('contenido', sql.VarChar(sql.MAX), contenido)
      .input('nombre', sql.VarChar(150), nombre)
      .input('precio', sql.Decimal(10, 2), precio)
      .input('stock', sql.Int, stock)
      .input('estado', sql.VarChar(50), finalEstado)
      .input('imagen_url', sql.VarChar(sql.MAX), imagen_url)
      .input('categoria', sql.VarChar(100), categoria)
      .query(`
        UPDATE Marketplace 
        SET contenido = @contenido, nombre = @nombre, precio = @precio, 
            stock = @stock, estado = @estado, imagen_url = @imagen_url, categoria = @categoria
        OUTPUT INSERTED.*
        WHERE id_publicacion = @id_marketplace
      `);
      
    if (result.recordset.length === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    
    await pool.request()
      .input('id_marketplace', sql.Int, id)
      .query('DELETE FROM Marketplace WHERE id_publicacion = @id_marketplace');
      
    res.json({ message: 'Entrada de Marketplace eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
