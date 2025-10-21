'use strict';

module.exports = {
  async up(queryInterface) {
    const table = 'product_histories';

    // Verificar si existe antes de eliminar
    const tableDesc = await queryInterface.describeTable(table);
    if (tableDesc.userName) {
      await queryInterface.removeColumn(table, 'userName');
      console.log('🧹 Columna antigua userName eliminada correctamente');
    } else {
      console.log('✅ La columna userName no existe, nada que eliminar');
    }
  },

  async down(queryInterface, Sequelize) {
    // Por si necesitas revertir
    await queryInterface.addColumn('product_histories', 'userName', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};
