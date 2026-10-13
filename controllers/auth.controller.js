const { sql, poolPromise } = require('../db');
const bcrypt = require('bcrypt');

exports.register = async (req, res) => {
  try {
    const { nombre, email, password_hash, foto_perfil, biografia } = req.body;
    const pool = await poolPromise;
    
    // Check if user exists
    const checkUser = await pool.request()
      .input('email', sql.VarChar(150), email)
      .query('SELECT id_usuario FROM Usuarios WHERE email = @email');

    if (checkUser.recordset.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password_hash, 10);

    const result = await pool.request()
      .input('nombre', sql.VarChar(100), nombre)
      .input('email', sql.VarChar(150), email)
      .input('password_hash', sql.VarChar(255), hashedPassword)
      .input('foto_perfil', sql.VarChar(sql.MAX), foto_perfil || null)
      .input('biografia', sql.VarChar(sql.MAX), biografia || null)
      .query(`
        INSERT INTO Usuarios (nombre, email, password_hash, foto_perfil, biografia)
        OUTPUT INSERTED.id_usuario, INSERTED.nombre, INSERTED.email, INSERTED.fecha_registro
        VALUES (@nombre, @email, @password_hash, @foto_perfil, @biografia)
      `);

    const userData = result.recordset && result.recordset.length > 0 ? result.recordset[0] : { email };
    res.status(201).json(userData);
  } catch (err) {
    console.error('Error in register:', err);
    res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
};

exports.registerSeller = async (req, res) => {
  try {
    const { nombre, email, password_hash, nombre_tienda } = req.body;
    const pool = await poolPromise;
    
    // Check if user exists
    const checkUser = await pool.request()
      .input('email', sql.VarChar(150), email)
      .query('SELECT id_usuario FROM Usuarios WHERE email = @email');

    if (!checkUser.recordset || checkUser.recordset.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password_hash, 10);

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const resultUser = await transaction.request()
        .input('nombre', sql.VarChar(100), nombre)
        .input('email', sql.VarChar(150), email)
        .input('password_hash', sql.VarChar(255), hashedPassword)
        .query(`
          INSERT INTO Usuarios (nombre, email, password_hash)
          OUTPUT INSERTED.id_usuario, INSERTED.nombre, INSERTED.email
          VALUES (@nombre, @email, @password_hash)
        `);

      const newUserId = resultUser.recordset && resultUser.recordset.length > 0 ? resultUser.recordset[0].id_usuario : null;
      if (!newUserId) throw new Error("No se pudo obtener el ID del usuario insertado");

      const resultSeller = await transaction.request()
        .input('id_usuario', sql.Int, newUserId)
        .input('nombre_tienda', sql.VarChar(150), nombre_tienda)
        .query(`
          INSERT INTO Vendedores (id_usuario, nombre_tienda)
          OUTPUT INSERTED.id_vendedor, INSERTED.nombre_tienda
          VALUES (@id_usuario, @nombre_tienda)
        `);

      await transaction.commit();

      res.status(201).json({
        user: resultUser.recordset[0],
        seller: resultSeller.recordset ? resultSeller.recordset[0] : null
      });
    } catch (txErr) {
      await transaction.rollback();
      throw txErr;
    }
  } catch (err) {
    console.error('Error in registerSeller:', err);
    res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password_hash } = req.body;
    const pool = await poolPromise;

    const result = await pool.request()
      .input('email', sql.VarChar(150), email)
      .query('SELECT * FROM Usuarios WHERE email = @email');

    if (!result.recordset || result.recordset.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result.recordset[0];
    const passwordMatch = await bcrypt.compare(password_hash, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    // Check if user is a seller
    const sellerResult = await pool.request()
      .input('id_usuario', sql.Int, user.id_usuario)
      .query('SELECT id_vendedor, nombre_tienda FROM Vendedores WHERE id_usuario = @id_usuario');

    const isSeller = sellerResult.recordset && sellerResult.recordset.length > 0;
    const sellerInfo = isSeller ? sellerResult.recordset[0] : null;

    // Create a mock token session for demonstration
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);

    await pool.request()
      .input('id_usuario', sql.Int, user.id_usuario)
      .input('token', sql.VarChar(255), token)
      .query('INSERT INTO Sesiones (id_usuario, token) VALUES (@id_usuario, @token)');

    res.json({ 
      message: 'Login exitoso', 
      token, 
      user: { 
        id: user.id_usuario, 
        nombre: user.nombre, 
        email: user.email,
        isSeller,
        sellerInfo
      } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
