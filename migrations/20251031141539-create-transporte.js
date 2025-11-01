'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('transportes', {
      placa: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true,
      },
      nombre_conductor: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      telefono: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      tipo_vehiculo: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('transportes');
  }
};
