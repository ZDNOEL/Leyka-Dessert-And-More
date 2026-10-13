const { sql, poolPromise } = require('./db');

async function migrate() {
    try {
        const pool = await poolPromise;
        console.log('🚀 Iniciando migración...');

        // 1. Renombrar Publicaciones a Marketplace (si existe)
        await pool.request().query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Publicaciones')
            BEGIN
                EXEC sp_rename 'Publicaciones', 'Marketplace';
                PRINT 'Tabla Publicaciones renombrada a Marketplace.';
            END
        `);

        // 2. Agregar columnas necesarias a Marketplace
        await pool.request().query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Marketplace')
            BEGIN
                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Marketplace' AND COLUMN_NAME = 'nombre')
                BEGIN
                    ALTER TABLE Marketplace ADD 
                        nombre VARCHAR(150),
                        precio DECIMAL(10,2),
                        stock INT DEFAULT 0,
                        estado VARCHAR(50) DEFAULT 'Disponible',
                        imagen_url VARCHAR(MAX),
                        categoria VARCHAR(100);
                    PRINT 'Columnas de producto agregadas a Marketplace.';
                END
            END
        `);

        // 3. Migrar datos de Productos a Marketplace
        await pool.request().query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Productos')
            BEGIN
                -- Limpiar Marketplace antes de migrar para evitar duplicados si se corre varias veces
                -- DELETE FROM Marketplace; 
                
                INSERT INTO Marketplace (id_usuario, contenido, nombre, precio, stock, estado, imagen_url, categoria, fecha_publicacion)
                SELECT v.id_usuario, p.descripcion, p.nombre, p.precio, p.stock, p.estado, p.imagen_url, p.categoria, p.fecha_registro
                FROM Productos p
                JOIN Vendedores v ON p.id_vendedor = v.id_vendedor;
                PRINT 'Datos migrados de Productos a Marketplace.';
            END
        `);

        console.log('✅ Migración completada exitosamente.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error durante la migración:', err);
        process.exit(1);
    }
}

migrate();
