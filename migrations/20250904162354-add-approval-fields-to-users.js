'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('users');
    if (!table.isApproved) {
      await queryInterface.addColumn('users', 'isApproved', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('users');
    if (table.isApproved) {
      await queryInterface.removeColumn('users', 'isApproved');
    }
  }
};
