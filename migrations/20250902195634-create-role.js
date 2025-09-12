'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_roles', {
      userUuid: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'uuid' },
        onDelete: 'CASCADE'
      },
      roleUuid: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'roles', key: 'uuid' },
        onDelete: 'CASCADE'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // Verificar si ya existe el constraint
    const [results] = await queryInterface.sequelize.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'user_roles' AND constraint_name = 'user_roles_unique'
    `);

    if (results.length === 0) {
      await queryInterface.addConstraint('user_roles', {
        fields: ['userUuid', 'roleUuid'],
        type: 'unique',
        name: 'user_roles_unique'
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_roles');
  }
};
