'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('stock_zero_events');

    if (!table.is_purchased) {
      await queryInterface.addColumn('stock_zero_events', 'is_purchased', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }

    if (!table.purchased_by) {
      await queryInterface.addColumn('stock_zero_events', 'purchased_by', {
        type: Sequelize.STRING(100),
        allowNull: true
      });
    }

    if (!table.purchased_at) {
      await queryInterface.addColumn('stock_zero_events', 'purchased_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }

    if (!table.created_product_id) {
      await queryInterface.addColumn('stock_zero_events', 'created_product_id', {
        type: Sequelize.UUID,
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('stock_zero_events');

    if (table.created_product_id) {
      await queryInterface.removeColumn('stock_zero_events', 'created_product_id');
    }

    if (table.purchased_at) {
      await queryInterface.removeColumn('stock_zero_events', 'purchased_at');
    }

    if (table.purchased_by) {
      await queryInterface.removeColumn('stock_zero_events', 'purchased_by');
    }

    if (table.is_purchased) {
      await queryInterface.removeColumn('stock_zero_events', 'is_purchased');
    }
  }
};