'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_suppliers_tipoAsesor" ADD VALUE IF NOT EXISTS 'Subdistribuidores';
    `);
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_suppliers_tipoAsesor" ADD VALUE IF NOT EXISTS 'Minorista';
    `);
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_suppliers_tipoAsesor" ADD VALUE IF NOT EXISTS 'Distribuidor';
    `);
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_suppliers_tipoAsesor" ADD VALUE IF NOT EXISTS 'Especialista de Marca';
    `);
  },

  async down() {
    // ⚠️ PostgreSQL no permite eliminar valores de un ENUM,
    // por lo que el down no puede revertir esto.
  }
};
