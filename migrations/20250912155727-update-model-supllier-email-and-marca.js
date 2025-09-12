// migrations/xxxxxx-update-supplier.js
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('suppliers', 'marca', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('suppliers', 'correo', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('suppliers', 'marca', {
      type: Sequelize.STRING,
      allowNull: false
    });

    await queryInterface.removeColumn('suppliers', 'correo');
  }
};
