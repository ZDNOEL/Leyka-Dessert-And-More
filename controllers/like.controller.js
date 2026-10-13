const { sql, poolPromise } = require('../db');

exports.toggleLike = async (req, res) => {
  try {
    const { id_usuario, id_publicacion } = req.body;
    const pool = await poolPromise;

    // Check if like already exists
    const checkLike = await pool.request()
      .input('id_usuario', sql.Int, id_usuario)
      .input('id_publicacion', sql.Int, id_publicacion)
      .query('SELECT id_like FROM Likes WHERE id_usuario = @id_usuario AND id_publicacion = @id_publicacion');

    if (checkLike.recordset.length > 0) {
      // Remove like
      await pool.request()
        .input('id_like', sql.Int, checkLike.recordset[0].id_like)
        .query('DELETE FROM Likes WHERE id_like = @id_like');
      res.json({ message: 'Like removido', liked: false });
    } else {
      // Add like
      await pool.request()
        .input('id_usuario', sql.Int, id_usuario)
        .input('id_publicacion', sql.Int, id_publicacion)
        .query('INSERT INTO Likes (id_usuario, id_publicacion) VALUES (@id_usuario, @id_publicacion)');
      res.json({ message: 'Like agregado', liked: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getLikesByPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id_publicacion', sql.Int, postId)
      .query('SELECT COUNT(*) as total_likes FROM Likes WHERE id_publicacion = @id_publicacion');
    
    res.json({ total_likes: result.recordset[0].total_likes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
