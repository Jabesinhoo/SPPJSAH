'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameColumn('products', 'marca', 'brand');

    // Aseguramos que la definición coincida
    await queryInterface.changeColumn('products', 'brand', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'N/A',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.renameColumn('products', 'brand', 'marca');

    // Revertir definición
    await queryInterface.changeColumn('products', 'marca', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'N/A',
    });
  }
};
