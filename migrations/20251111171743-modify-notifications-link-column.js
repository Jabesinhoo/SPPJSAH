// migrations/XXXXXXXXXXXXXX-modify-notifications-link-column.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Cambiar la columna 'link' de VARCHAR(255) a TEXT
    await queryInterface.changeColumn('notifications', 'link', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    
    console.log('✅ Columna "link" modificada a TEXT');
  },

  async down(queryInterface, Sequelize) {
    // Revertir a VARCHAR(255)
    await queryInterface.changeColumn('notifications', 'link', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    
    console.log('🔙 Columna "link" revertida a VARCHAR(255)');
  }
};