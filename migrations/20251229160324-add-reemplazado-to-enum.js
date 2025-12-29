'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Para PostgreSQL - añadir valor al ENUM
    return queryInterface.sequelize.query(`
      -- Primero, verifica si 'Reemplazado' ya existe en el ENUM
      DO $$
      BEGIN
        -- Intenta añadir el valor, si ya existe no hará nada
        BEGIN
          ALTER TYPE "enum_products_categoria" ADD VALUE 'Reemplazado';
          RAISE NOTICE 'Valor Reemplazado añadido al ENUM';
        EXCEPTION
          WHEN duplicate_object THEN
            RAISE NOTICE 'Valor Reemplazado ya existe en el ENUM';
        END;
      END $$;
    `);
  },

  async down(queryInterface, Sequelize) {
    // No se puede eliminar fácilmente un valor de ENUM en PostgreSQL
    // Pero podemos crear un nuevo tipo sin ese valor si es necesario
    console.log('⚠️ Advertencia: Revertir esta migración no es trivial en PostgreSQL');
    return Promise.resolve();
  }
};