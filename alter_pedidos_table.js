const { sql, poolPromise } = require('./db.js');

async function run() {
  try {
    const pool = await poolPromise;
    console.log("Checking for id_usuario in Confirmacion_Pedidos...");
    const check = await pool.request().query("SELECT COL_LENGTH('Confirmacion_Pedidos', 'id_usuario') as col");
    if (check.recordset[0].col == null) {
      console.log("Adding id_usuario column...");
      await pool.request().query("ALTER TABLE Confirmacion_Pedidos ADD id_usuario INT NULL;");
      console.log("Adding foreign key constraint...");
      await pool.request().query("ALTER TABLE Confirmacion_Pedidos ADD CONSTRAINT FK_ConfirmacionPedidos_Usuarios FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario) ON DELETE SET NULL;");
      console.log("Success!");
    } else {
      console.log("Column already exists.");
    }
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
