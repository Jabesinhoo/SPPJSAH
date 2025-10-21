'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'product_histories';
    const tableDesc = await queryInterface.describeTable(table);

    // 🧩 Agregar columna created_at si no existe
    if (!tableDesc.created_at && !tableDesc.createdAt) {
      await queryInterface.addColumn(table, 'created_at', {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      });
      console.log('✅ Columna created_at agregada');
    } else if (tableDesc.createdAt) {
      await queryInterface.renameColumn(table, 'createdAt', 'created_at');
      console.log('🔄 Columna createdAt renombrada a created_at');
    }

    // 🧩 Agregar columna updated_at si no existe
    if (!tableDesc.updated_at && !tableDesc.updatedAt) {
      await queryInterface.addColumn(table, 'updated_at', {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      });
      console.log('✅ Columna updated_at agregada');
    } else if (tableDesc.updatedAt) {
      await queryInterface.renameColumn(table, 'updatedAt', 'updated_at');
      console.log('🔄 Columna updatedAt renombrada a updated_at');
    }
  },

  async down(queryInterface, Sequelize) {
    const table = 'product_histories';
    await queryInterface.removeColumn(table, 'created_at');
    await queryInterface.removeColumn(table, 'updated_at');
  },
};
