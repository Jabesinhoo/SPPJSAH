'use strict';

module.exports = {
  async up(queryInterface) {
    const table = 'product_histories';

    // Verificamos si existe antes de eliminarla
    const tableDesc = await queryInterface.describeTable(table);
    if (tableDesc.userName) {
      await queryInterface.removeColumn(table, 'userName');
      console.log('🧹 Columna userName eliminada correctamente');
    } else {
      console.log('✅ Columna userName ya no existe');
    }
  },

  async down(queryInterface, Sequelize) {
    // Si deseas poder revertir la migración
    await queryInterface.addColumn('product_histories', 'userName', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};
