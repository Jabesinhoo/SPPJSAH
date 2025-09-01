require('dotenv').config();
const { sequelize } = require('./models');

async function syncDatabase() {
  try {
    console.log('🔄 Sincronizando base de datos...');
    
    // Opciones:
    // { force: true } - Borra y recrea todo
    // { alter: true } - Actualiza sin borrar datos existentes
    await sequelize.sync({ force: true });
    
    console.log('✅ Base de datos sincronizada correctamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error sincronizando la base de datos:', error);
    process.exit(1);
  }
}

syncDatabase();