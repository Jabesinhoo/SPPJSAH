'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('outsources', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      nombre_tecnico: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      telefono: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      cc: {
        type: Sequelize.BIGINT,
        allowNull: false,
        unique: true,
      },
      sku: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
      },
      tipo_servicio: {
        type: Sequelize.ARRAY(Sequelize.STRING),
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
    await queryInterface.dropTable('outsources');
  }
};
