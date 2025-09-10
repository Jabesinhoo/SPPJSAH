'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Agregar campos title y metadata si no existen
    const tableInfo = await queryInterface.describeTable('notifications');
    
    if (!tableInfo.title) {
      await queryInterface.addColumn('notifications', 'title', {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: 'Notificación'
      });
    }

    if (!tableInfo.metadata) {
      await queryInterface.addColumn('notifications', 'metadata', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {}
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Remover campos en caso de rollback
    await queryInterface.removeColumn('notifications', 'title');
    await queryInterface.removeColumn('notifications', 'metadata');
  }
};