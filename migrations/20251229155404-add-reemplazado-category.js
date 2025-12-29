// migrations/XXXXXXXXXXXXXX-add-reemplazado-category.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Para PostgreSQL:
    await queryInterface.sequelize.query(`
      ALTER TABLE products 
      DROP CONSTRAINT "products_categoria_check",
      ADD CONSTRAINT "products_categoria_check" 
      CHECK (categoria IN ('Faltantes', 'Bajo Pedido', 'Agotados con el Proveedor', 'Demasiadas Existencias', 'Realizado', 'Descontinuado', 'Reemplazado'))
    `);
    
    // O para SQLite/MySQL:
    // await queryInterface.changeColumn('products', 'categoria', {
    //   type: Sequelize.ENUM('Faltantes', 'Bajo Pedido', 'Agotados con el Proveedor', 'Demasiadas Existencias', 'Realizado', 'Descontinuado', 'REEMPLAZADO'),
    //   allowNull: false,
    //   defaultValue: 'Faltantes'
    // });
  },

  down: async (queryInterface, Sequelize) => {
    // Revertir cambios si es necesario
    await queryInterface.sequelize.query(`
      ALTER TABLE products 
      DROP CONSTRAINT "products_categoria_check",
      ADD CONSTRAINT "products_categoria_check" 
      CHECK (categoria IN ('Faltantes', 'Bajo Pedido', 'Agotados con el Proveedor', 'Demasiadas Existencias', 'Realizado', 'Descontinuado'))
    `);
  }
};