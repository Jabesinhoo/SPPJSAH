'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = 'product_histories';
    const table = await queryInterface.describeTable(tableName);

    if (table.product_id && !table.productId) {
      await queryInterface.renameColumn(tableName, 'product_id', 'productId');
    }

    if (table.old_data && !table.oldData) {
      await queryInterface.renameColumn(tableName, 'old_data', 'oldData');
    }

    if (table.new_data && !table.newData) {
      await queryInterface.renameColumn(tableName, 'new_data', 'newData');
    }

    if (table.changed_fields && !table.changedFields) {
      await queryInterface.renameColumn(tableName, 'changed_fields', 'changedFields');
    }

    if (table.user_name && !table.userName) {
      await queryInterface.renameColumn(tableName, 'user_name', 'userName');
    }

    if (table.bulk_operation_id && !table.bulkOperationId) {
      await queryInterface.renameColumn(tableName, 'bulk_operation_id', 'bulkOperationId');
    }

    if (table.created_at && !table.createdAt) {
      await queryInterface.renameColumn(tableName, 'created_at', 'createdAt');
    }

    if (table.updated_at && !table.updatedAt) {
      await queryInterface.renameColumn(tableName, 'updated_at', 'updatedAt');
    }

    const refreshed = await queryInterface.describeTable(tableName);

    if (!refreshed.userName) {
      await queryInterface.addColumn(tableName, 'userName', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    if (!refreshed.bulkOperationId) {
      await queryInterface.addColumn(tableName, 'bulkOperationId', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    return Promise.resolve();
  }
};