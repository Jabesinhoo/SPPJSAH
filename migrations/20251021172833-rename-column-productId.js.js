'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'product_histories';

    // Verifica si la columna con camelCase existe antes de renombrar
    const tableDesc = await queryInterface.describeTable(table);
    if (tableDesc.productId) {
      await queryInterface.renameColumn(table, 'productId', 'product_id');
      console.log('✅ Columna productId renombrada a product_id');
    } else {
      console.log('⚠️ La columna productId no existe o ya fue renombrada');
    }
  },

  async down(queryInterface, Sequelize) {
    const table = 'product_histories';
    const tableDesc = await queryInterface.describeTable(table);
    if (tableDesc.product_id) {
      await queryInterface.renameColumn(table, 'product_id', 'productId');
    }
  },
};
