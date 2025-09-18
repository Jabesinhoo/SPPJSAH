// migrations/xxxxxx-add-unique-to-supplier-nombre.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addConstraint('suppliers', {
      fields: ['nombre'],
      type: 'unique',
      name: 'unique_supplier_nombre'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('suppliers', 'unique_supplier_nombre');
  }
};
