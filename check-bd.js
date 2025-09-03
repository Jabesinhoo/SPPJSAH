// check-models.js
const { sequelize, User, Product, Role, Supplier, Spreadsheet } = require('./models');
const logger = require('../utils/logger');

async function checkModels() {
  try {
    logger.info('🔍 Verificando modelos cargados...');
    
    const models = [
      { name: 'User', model: User },
      { name: 'Product', model: Product },
      { name: 'Role', model: Role },
      { name: 'Supplier', model: Supplier },
      { name: 'Spreadsheet', model: Spreadsheet }
    ];

    models.forEach(({ name, model }) => {
      if (model) {
        logger.info(`✅ ${name} cargado correctamente`);
      } else {
        logger.info(`❌ ${name} NO cargado`);
      }
    });

    logger.info('\n🔄 Sincronizando base de datos...');
    await sequelize.sync({ force: true });
    logger.info('✅ Base de datos sincronizada');

    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    logger.info('\n📊 Tablas creadas:');
    tables.forEach(table => logger.info(`- ${table.table_name}`));

  } catch (error) {
    logger.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkModels();