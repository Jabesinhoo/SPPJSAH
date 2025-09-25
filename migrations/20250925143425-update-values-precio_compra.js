'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Cambiar columna a BIGINT
    await queryInterface.changeColumn('products', 'precio_compra', {
      type: Sequelize.BIGINT,
      allowNull: false,
      defaultValue: 0
    });
  },

  async down(queryInterface, Sequelize) {
    // Revertir a DECIMAL(13,2) en caso de rollback
    await queryInterface.changeColumn('products', 'precio_compra', {
      type: Sequelize.DECIMAL(13, 2),
      allowNull: false,
      defaultValue: 0
    });
  }
};
