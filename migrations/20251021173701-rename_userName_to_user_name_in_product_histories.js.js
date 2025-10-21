'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'product_histories';

    // 🔧 Renombrar columna mal creada
    const tableDesc = await queryInterface.describeTable(table);
    if (tableDesc.userName) {
      await queryInterface.renameColumn(table, 'userName', 'user_name');
      console.log('✅ Columna userName renombrada a user_name');
    }

    // 🔧 Asegurar que permita NULL (por si acaso)
    await queryInterface.changeColumn(table, 'user_name', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.renameColumn('product_histories', 'user_name', 'userName');
  },
};
