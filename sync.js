require('dotenv').config();
const { sequelize } = require('./models');
const logger = require('../utils/logger');

async function syncDatabase() {
  try {
    logger.info('🔄 Sincronizando base de datos...');

    await sequelize.sync({ force: true });
    
    logger.info('✅ Base de datos sincronizada correctamente');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error sincronizando la base de datos:', error);
    process.exit(1);
  }
}

syncDatabase();