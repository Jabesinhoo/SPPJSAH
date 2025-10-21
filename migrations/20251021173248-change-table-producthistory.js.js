'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'product_histories';
    const tableDesc = await queryInterface.describeTable(table);

    if (tableDesc.userId) {
      await queryInterface.removeColumn(table, 'userId');
      console.log('🧹 Columna userId eliminada de product_histories');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('product_histories', 'userId', {
      type: Sequelize.UUID,
      allowNull: true,
    });
  },
};
