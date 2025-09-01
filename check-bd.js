// check-models.js
const { sequelize, User, Product, Role, Supplier, Spreadsheet } = require('./models');

async function checkModels() {
  try {
    console.log('🔍 Verificando modelos cargados...');
    
    // Verificar que todos los modelos existen
    const models = [
      { name: 'User', model: User },
      { name: 'Product', model: Product },
      { name: 'Role', model: Role },
      { name: 'Supplier', model: Supplier },
      { name: 'Spreadsheet', model: Spreadsheet }
    ];

    models.forEach(({ name, model }) => {
      if (model) {
        console.log(`✅ ${name} cargado correctamente`);
      } else {
        console.log(`❌ ${name} NO cargado`);
      }
    });

    // Sincronizar base de datos
    console.log('\n🔄 Sincronizando base de datos...');
    await sequelize.sync({ force: true });
    console.log('✅ Base de datos sincronizada');

    // Verificar tablas creadas
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\n📊 Tablas creadas:');
    tables.forEach(table => console.log(`- ${table.table_name}`));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkModels();