module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'email', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: false
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'email');
  }
};
