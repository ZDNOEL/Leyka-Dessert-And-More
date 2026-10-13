const { sql, poolPromise } = require('../db');

exports.getCommentsByPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id_publicacion', sql.Int, postId)
      .query(`
        SELECT c.id_comentario, c.comentario, c.fecha_comentario,
               u.id_usuario, u.nombre, u.foto_perfil
        FROM Comentarios c
        JOIN Usuarios u ON c.id_usuario = u.id_usuario
        WHERE c.id_publicacion = @id_publicacion
        ORDER BY c.fecha_comentario ASC
      `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { id_usuario, id_publicacion, comentario } = req.body;
    const pool = await poolPromise;
    
    const result = await pool.request()
      .input('id_usuario', sql.Int, id_usuario)
      .input('id_publicacion', sql.Int, id_publicacion)
      .input('comentario', sql.VarChar(sql.MAX), comentario)
      .query(`
        INSERT INTO Comentarios (id_usuario, id_publicacion, comentario)
        OUTPUT INSERTED.*
        VALUES (@id_usuario, @id_publicacion, @comentario)
      `);
      
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    
    await pool.request()
      .input('id_comentario', sql.Int, id)
      .query('DELETE FROM Comentarios WHERE id_comentario = @id_comentario');
      
    res.json({ message: 'Comentario eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
