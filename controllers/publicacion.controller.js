const { sql, poolPromise } = require('../db');

// Obtener todas las publicaciones y combinarlas con los productos del marketplace (opcional)
// O simplemente obtener publicaciones
exports.getFeed = async (req, res) => {
  try {
    const pool = await poolPromise;
    
    // Obtener publicaciones
    const pubResult = await pool.request().query(`
      SELECT p.id_pub, p.titulo, p.descripcion, p.imagen_url, p.fecha_registro,
             u.id_usuario, u.nombre as nombre_usuario, u.foto_perfil,
             (SELECT COUNT(*) FROM Likes_Pub WHERE id_pub = p.id_pub) as total_likes
      FROM Publicaciones p
      JOIN Usuarios u ON p.id_usuario = u.id_usuario
      ORDER BY p.fecha_registro DESC
    `);
    
    // Podríamos devolver ambos arreglos (ya no, el usuario no quiere productos aquí)
    res.json({
      publicaciones: pubResult.recordset
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Crear una publicación
exports.createPublicacion = async (req, res) => {
  try {
    const { id_usuario, titulo, descripcion, imagen_url } = req.body;
    const pool = await poolPromise;
    
    const result = await pool.request()
      .input('id_usuario', sql.Int, id_usuario)
      .input('titulo', sql.VarChar(150), titulo)
      .input('descripcion', sql.VarChar(sql.MAX), descripcion)
      .input('imagen_url', sql.VarChar(sql.MAX), imagen_url || '')
      .query(`
        INSERT INTO Publicaciones (id_usuario, titulo, descripcion, imagen_url)
        OUTPUT INSERTED.*
        VALUES (@id_usuario, @titulo, @descripcion, @imagen_url)
      `);
      
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Obtener comentarios de una publicación
exports.getComments = async (req, res) => {
  try {
    const { id_pub } = req.params;
    const pool = await poolPromise;
    
    const result = await pool.request()
      .input('id_pub', sql.Int, id_pub)
      .query(`
        SELECT c.id_comentario, c.comentario, c.fecha_comentario,
               u.id_usuario, u.nombre, u.foto_perfil
        FROM Comentarios_Pub c
        JOIN Usuarios u ON c.id_usuario = u.id_usuario
        WHERE c.id_pub = @id_pub
        ORDER BY c.fecha_comentario ASC
      `);
      
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Agregar comentario a una publicación
exports.addComment = async (req, res) => {
  try {
    const { id_usuario, id_pub, comentario } = req.body;
    const pool = await poolPromise;
    
    const result = await pool.request()
      .input('id_usuario', sql.Int, id_usuario)
      .input('id_pub', sql.Int, id_pub)
      .input('comentario', sql.VarChar(sql.MAX), comentario)
      .query(`
        INSERT INTO Comentarios_Pub (id_usuario, id_pub, comentario)
        OUTPUT INSERTED.*
        VALUES (@id_usuario, @id_pub, @comentario)
      `);
      
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Dar o quitar like
exports.toggleLike = async (req, res) => {
  try {
    const { id_usuario, id_pub } = req.body;
    const pool = await poolPromise;

    const checkLike = await pool.request()
      .input('id_usuario', sql.Int, id_usuario)
      .input('id_pub', sql.Int, id_pub)
      .query('SELECT id_like FROM Likes_Pub WHERE id_usuario = @id_usuario AND id_pub = @id_pub');

    if (checkLike.recordset.length > 0) {
      await pool.request()
        .input('id_like', sql.Int, checkLike.recordset[0].id_like)
        .query('DELETE FROM Likes_Pub WHERE id_like = @id_like');
      res.json({ message: 'Like removido', liked: false });
    } else {
      await pool.request()
        .input('id_usuario', sql.Int, id_usuario)
        .input('id_pub', sql.Int, id_pub)
        .query('INSERT INTO Likes_Pub (id_usuario, id_pub) VALUES (@id_usuario, @id_pub)');
      res.json({ message: 'Like agregado', liked: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Editar publicación
exports.updatePublicacion = async (req, res) => {
  try {
    const { id_pub } = req.params;
    const { titulo, descripcion, imagen_url } = req.body;
    const pool = await poolPromise;
    
    // Solo actualizamos la imagen si se envía una nueva
    const query = imagen_url !== undefined && imagen_url !== ''
      ? `UPDATE Publicaciones SET titulo = @titulo, descripcion = @descripcion, imagen_url = @imagen_url OUTPUT INSERTED.* WHERE id_pub = @id_pub`
      : `UPDATE Publicaciones SET titulo = @titulo, descripcion = @descripcion OUTPUT INSERTED.* WHERE id_pub = @id_pub`;

    const request = pool.request()
      .input('id_pub', sql.Int, id_pub)
      .input('titulo', sql.VarChar(150), titulo)
      .input('descripcion', sql.VarChar(sql.MAX), descripcion);
      
    if (imagen_url !== undefined && imagen_url !== '') {
      request.input('imagen_url', sql.VarChar(sql.MAX), imagen_url);
    }

    const result = await request.query(query);
      
    if (result.recordset.length === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Eliminar publicación
exports.deletePublicacion = async (req, res) => {
  try {
    const { id_pub } = req.params;
    const pool = await poolPromise;
    
    await pool.request()
      .input('id_pub', sql.Int, id_pub)
      .query('DELETE FROM Publicaciones WHERE id_pub = @id_pub');
      
    res.json({ message: 'Publicación eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
