'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'product_histories';

    // Asegurarnos de que existe la extensión para UUID
    await queryInterface.sequelize.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    const tableDesc = await queryInterface.describeTable(table);

    // 🔧 Agregar columnas que falten
    if (!tableDesc.old_data) {
      await queryInterface.addColumn(table, 'old_data', {
        type: Sequelize.JSONB,
        allowNull: true,
      });
      console.log('✅ Columna old_data agregada');
    }

    if (!tableDesc.new_data) {
      await queryInterface.addColumn(table, 'new_data', {
        type: Sequelize.JSONB,
        allowNull: true,
      });
      console.log('✅ Columna new_data agregada');
    }

    if (!tableDesc.changed_fields) {
      await queryInterface.addColumn(table, 'changed_fields', {
        type: Sequelize.JSONB,
        allowNull: true,
      });
      console.log('✅ Columna changed_fields agregada');
    }

    if (!tableDesc.user_name) {
      await queryInterface.addColumn(table, 'user_name', {
        type: Sequelize.STRING,
        allowNull: true,
      });
      console.log('✅ Columna user_name agregada');
    }

    if (!tableDesc.bulk_operation_id) {
      await queryInterface.addColumn(table, 'bulk_operation_id', {
        type: Sequelize.STRING,
        allowNull: true,
      });
      console.log('✅ Columna bulk_operation_id agregada');
    }

    // Por si la relación del producto también está con nombre diferente
    if (!tableDesc.product_id && tableDesc.productId) {
      await queryInterface.renameColumn(table, 'productId', 'product_id');
      console.log('✅ Columna productId renombrada a product_id');
    }
  },

  async down(queryInterface, Sequelize) {
    const table = 'product_histories';

    await queryInterface.removeColumn(table, 'old_data');
    await queryInterface.removeColumn(table, 'new_data');
    await queryInterface.removeColumn(table, 'changed_fields');
    await queryInterface.removeColumn(table, 'user_name');
    await queryInterface.removeColumn(table, 'bulk_operation_id');
  },
};
