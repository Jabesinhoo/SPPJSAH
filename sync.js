require('dotenv').config();
const { sequelize } = require('./models');

async function syncDatabase() {
  try {
    console.log('🔄 Sincronizando base de datos...');

    await sequelize.sync({ force: true });
    
    console.log('✅ Base de datos sincronizada correctamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error sincronizando la base de datos:', error);
    process.exit(1);
  }
}

syncDatabase();