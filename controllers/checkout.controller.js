const { sql, poolPromise } = require('../db');

exports.confirmOrder = async (req, res) => {
  const { items, total, id_usuario } = req.body;

  if (!items || !items.length) {
    return res.status(400).json({ error: 'El carrito esta vacio.' });
  }

  try {
    const pool = await poolPromise;
    const transaction = pool.transaction();
    
    await transaction.begin();

    try {
      // Registrar el pedido
      const detallesPedido = JSON.stringify(items);
      const insertPedido = await transaction.request()
        .input('detalles_pedido', detallesPedido)
        .input('total', total)
        .input('id_usuario', sql.Int, id_usuario || null)
        .query(`
          INSERT INTO Confirmacion_Pedidos (id_usuario, detalles_pedido, total, fecha_pedido)
          OUTPUT inserted.id_pedido
          VALUES (@id_usuario, @detalles_pedido, @total, GETDATE())
        `);
      
      const idPedido = insertPedido.recordset[0].id_pedido;

      // Actualizar el stock
      for (const item of items) {
        const id_producto = item.id_producto;
        const cantidad = item.quantity;

        // Validar stock actual
        const stockCheck = await transaction.request()
          .input('id_producto', id_producto)
          .query('SELECT stock FROM Productos WHERE id_producto = @id_producto');

        if (stockCheck.recordset.length === 0) {
          throw new Error(`El producto con ID ${id_producto} no existe.`);
        }

        const stockActual = stockCheck.recordset[0].stock;

        if (stockActual < cantidad) {
          throw new Error(`Stock insuficiente para el producto ID ${id_producto}. Stock disponible: ${stockActual}`);
        }

        // Restar el stock y actualizar estado si llega a 0
        await transaction.request()
          .input('cantidad', cantidad)
          .input('id_producto', id_producto)
          .query(`
            UPDATE Productos
            SET stock = stock - @cantidad,
                estado = CASE WHEN stock - @cantidad <= 0 THEN 'Agotado' ELSE estado END
            WHERE id_producto = @id_producto
          `);
      }

      await transaction.commit();
      res.json({ message: 'Pedido confirmado con exito', id_pedido: idPedido });

    } catch (err) {
      await transaction.rollback();
      throw err;
    }

  } catch (error) {
    console.error('Error al confirmar pedido:', error);
    res.status(500).json({ error: error.message || 'Error al confirmar el pedido' });
  }
};
