const { sql, poolPromise } = require('../db');

exports.getMessages = async (req, res) => {
  try {
    const { user1, user2 } = req.params; // IDs de los dos usuarios en la conversación
    const pool = await poolPromise;
    const result = await pool.request()
      .input('u1', sql.Int, user1)
      .input('u2', sql.Int, user2)
      .query(`
        SELECT m.id_mensaje, m.mensaje, m.fecha_envio, m.id_remitente, m.id_destinatario
        FROM Mensajes m
        WHERE (m.id_remitente = @u1 AND m.id_destinatario = @u2)
           OR (m.id_remitente = @u2 AND m.id_destinatario = @u1)
        ORDER BY m.fecha_envio ASC
      `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { id_remitente, id_destinatario, mensaje } = req.body;
    const pool = await poolPromise;
    
    const result = await pool.request()
      .input('id_remitente', sql.Int, id_remitente)
      .input('id_destinatario', sql.Int, id_destinatario)
      .input('mensaje', sql.VarChar(sql.MAX), mensaje)
      .query(`
        INSERT INTO Mensajes (id_remitente, id_destinatario, mensaje)
        OUTPUT INSERTED.*
        VALUES (@id_remitente, @id_destinatario, @mensaje)
      `);
      
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
