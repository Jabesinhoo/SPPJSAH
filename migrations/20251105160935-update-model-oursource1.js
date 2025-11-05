'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Para PostgreSQL - Quitar el valor por defecto del campo sku
    await queryInterface.sequelize.query(`
      ALTER TABLE outsources 
      ALTER COLUMN sku DROP DEFAULT;
    `);

    // Opcional: Si quieres asegurarte de que no hay valores nulos, actualiza cualquier valor existente
    // await queryInterface.sequelize.query(`
    //   UPDATE outsources 
    //   SET sku = id 
    //   WHERE sku IS NULL OR sku = 1;
    // `);
  },

  down: async (queryInterface, Sequelize) => {
    // Para revertir - Restaurar el valor por defecto
    await queryInterface.sequelize.query(`
      ALTER TABLE outsources 
      ALTER COLUMN sku SET DEFAULT 1;
    `);
  }
};