'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('stock_zero_events');

    if (!table.image_url) {
      await queryInterface.addColumn('stock_zero_events', 'image_url', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }

    if (!table.permalink) {
      await queryInterface.addColumn('stock_zero_events', 'permalink', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }

    if (!table.price) {
      await queryInterface.addColumn('stock_zero_events', 'price', {
        type: Sequelize.STRING(50),
        allowNull: true
      });
    }

    if (!table.date_modified) {
      await queryInterface.addColumn('stock_zero_events', 'date_modified', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('stock_zero_events');

    if (table.date_modified) {
      await queryInterface.removeColumn('stock_zero_events', 'date_modified');
    }

    if (table.price) {
      await queryInterface.removeColumn('stock_zero_events', 'price');
    }

    if (table.permalink) {
      await queryInterface.removeColumn('stock_zero_events', 'permalink');
    }

    if (table.image_url) {
      await queryInterface.removeColumn('stock_zero_events', 'image_url');
    }
  }
};