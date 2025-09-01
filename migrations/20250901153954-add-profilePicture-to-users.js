'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'profilePicture', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'profilePicture');
  }
};
