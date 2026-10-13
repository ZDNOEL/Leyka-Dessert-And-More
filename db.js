const sql = require('mssql/msnodesqlv8');
require('dotenv').config();

const dbConfig = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'LeykaDB',
  driver: 'msnodesqlv8',
  options: {
    trustedConnection: true, // Use Windows Authentication
    trustServerCertificate: true // Optional for local dev
  }
};

const poolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then(pool => {
    console.log('✅ Conectado a SQL Server (LeykaDB) con Autenticación de Windows');
    return pool;
  })
  .catch(err => {
    console.error('❌ Error de conexión a la Base de Datos:', err);
    process.exit(1);
  });

module.exports = {
  sql,
  poolPromise
};
