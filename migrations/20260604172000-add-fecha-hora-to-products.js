'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('products');

    if (!table.fecha) {
      await queryInterface.addColumn('products', 'fecha', {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      });
    }

    if (!table.hora) {
      await queryInterface.addColumn('products', 'hora', {
        type: Sequelize.TIME,
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('products');

    if (table.hora) {
      await queryInterface.removeColumn('products', 'hora');
    }

    if (table.fecha) {
      await queryInterface.removeColumn('products', 'fecha');
    }
  }
};