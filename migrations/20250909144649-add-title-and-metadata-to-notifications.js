'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('notifications', 'title', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: ''           // pon default para no fallar con filas existentes
    });
    await queryInterface.addColumn('notifications', 'metadata', {
      type: Sequelize.JSONB,
      allowNull: true
    });

    // Opcional: luego de setear títulos reales, puedes quitar el default
    // await queryInterface.changeColumn('notifications', 'title', {
    //   type: Sequelize.STRING,
    //   allowNull: false
    // });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('notifications', 'metadata');
    await queryInterface.removeColumn('notifications', 'title');
  }
};
