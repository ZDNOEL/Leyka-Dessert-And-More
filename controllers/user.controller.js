const { sql, poolPromise } = require('../db');

exports.getProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    const result = await pool.request()
      .input('id_usuario', sql.Int, id)
      .query(`
        SELECT u.id_usuario, u.nombre, u.email, u.fecha_registro, u.foto_perfil, u.biografia, u.whatsapp,
               v.id_vendedor, v.nombre_tienda
        FROM Usuarios u
        LEFT JOIN Vendedores v ON u.id_usuario = v.id_usuario
        WHERE u.id_usuario = @id_usuario
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = result.recordset[0];
    res.json({
      id: user.id_usuario,
      nombre: user.nombre,
      email: user.email,
      fecha_registro: user.fecha_registro,
      foto_perfil: user.foto_perfil,
      biografia: user.biografia,
      whatsapp: user.whatsapp,
      isSeller: user.id_vendedor !== null,
      sellerInfo: user.id_vendedor ? {
        id_vendedor: user.id_vendedor,
        nombre_tienda: user.nombre_tienda
      } : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    const pool = await poolPromise;

    const checkResult = await pool.request()
      .input('id_usuario', sql.Int, id)
      .input('password_hash', sql.VarChar(255), currentPassword)
      .query('SELECT id_usuario FROM Usuarios WHERE id_usuario = @id_usuario AND password_hash = @password_hash');

    if (checkResult.recordset.length === 0) {
      return res.status(401).json({ error: 'Contrasena actual incorrecta' });
    }

    await pool.request()
      .input('id_usuario', sql.Int, id)
      .input('new_password', sql.VarChar(255), newPassword)
      .query('UPDATE Usuarios SET password_hash = @new_password WHERE id_usuario = @id_usuario');

    res.json({ message: 'Contrasena actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, foto_perfil, biografia, whatsapp, currentPassword, newPassword } = req.body;
    const pool = await poolPromise;
    const shouldUpdatePhoto = Object.prototype.hasOwnProperty.call(req.body, 'foto_perfil');

    if (!nombre || !email) {
      return res.status(400).json({ error: 'Nombre y correo son obligatorios' });
    }

    if (newPassword && newPassword.trim() !== '') {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Ingresa tu contrasena actual para establecer una nueva' });
      }

      const check = await pool.request()
        .input('id_usuario', sql.Int, id)
        .input('pass', sql.VarChar(255), currentPassword)
        .query('SELECT id_usuario FROM Usuarios WHERE id_usuario = @id_usuario AND password_hash = @pass');

      if (check.recordset.length === 0) {
        return res.status(401).json({ error: 'La contrasena actual no es correcta' });
      }

      await pool.request()
        .input('id_usuario', sql.Int, id)
        .input('new_pass', sql.VarChar(255), newPassword)
        .query('UPDATE Usuarios SET password_hash = @new_pass WHERE id_usuario = @id_usuario');
    }

    const request = pool.request()
      .input('id_usuario', sql.Int, id)
      .input('nombre', sql.VarChar(100), nombre)
      .input('email', sql.VarChar(150), email)
      .input('biografia', sql.VarChar(sql.MAX), biografia || '')
      .input('whatsapp', sql.VarChar(20), whatsapp || '');

    let updateQuery = `
      UPDATE Usuarios
      SET nombre = @nombre,
          email = @email,
          biografia = @biografia,
          whatsapp = @whatsapp`;

    if (shouldUpdatePhoto) {
      request.input('foto_perfil', sql.VarChar(sql.MAX), foto_perfil || null);
      updateQuery += `,
          foto_perfil = @foto_perfil`;
    }

    updateQuery += `
      WHERE id_usuario = @id_usuario
    `;

    await request.query(updateQuery);

    res.json({ message: 'Perfil actualizado exitosamente' });
  } catch (err) {
    console.error('SERVER ERROR [updateProfile]:', err);
    res.status(500).json({ error: 'Error interno: ' + err.message });
  }
};
