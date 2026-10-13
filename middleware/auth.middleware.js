const { sql, poolPromise } = require('../db');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('token', sql.VarChar, token)
      .query(`
        SELECT s.id_usuario, u.nombre, u.email, v.id_vendedor 
        FROM Sesiones s
        JOIN Usuarios u ON s.id_usuario = u.id_usuario
        LEFT JOIN Vendedores v ON u.id_usuario = v.id_usuario
        WHERE s.token = @token
      `);

    if (result.recordset.length === 0) {
      return res.status(403).json({ error: 'Token inválido o sesión expirada.' });
    }

    const session = result.recordset[0];
    req.user = {
      id: session.id_usuario,
      nombre: session.nombre,
      email: session.email,
      isSeller: session.id_vendedor !== null,
      sellerId: session.id_vendedor
    };

    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const isSeller = (req, res, next) => {
  if (!req.user || !req.user.isSeller) {
    return res.status(403).json({ error: 'Acceso restringido a vendedores.' });
  }
  next();
};

module.exports = { verifyToken, isSeller };
