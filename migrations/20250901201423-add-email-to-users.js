'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Verifica si la columna ya existe antes de agregarla
    const tableInfo = await queryInterface.describeTable('users');
    if (!tableInfo.email) {
      await queryInterface.addColumn('users', 'email', {
        type: Sequelize.STRING,
        allowNull: true,
        unique: false
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('users');
    if (tableInfo.email) {
      await queryInterface.removeColumn('users', 'email');
    }
  }
};
