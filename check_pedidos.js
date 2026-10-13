const { sql, poolPromise } = require('./db.js');

async function run() {
  try {
    const pool = await poolPromise;
    
    console.log("\n=== USUARIOS EN LA BASE DE DATOS ===");
    const usuarios = await pool.request().query("SELECT id_usuario, nombre, email FROM Usuarios ORDER BY id_usuario");
    console.table(usuarios.recordset);
    
    console.log("\n=== PEDIDOS ACTUALES (Confirmacion_Pedidos) ===");
    const pedidos = await pool.request().query("SELECT id_pedido, detalles_pedido, total, fecha_pedido, id_usuario FROM Confirmacion_Pedidos ORDER BY id_pedido");
    console.table(pedidos.recordset);
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
