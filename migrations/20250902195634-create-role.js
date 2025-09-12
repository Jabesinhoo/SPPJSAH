// migrations/20240910120000-create-user-roles.js
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

    // índice único para que un usuario no tenga el mismo rol dos veces
    await queryInterface.addConstraint('user_roles', {
      fields: ['userUuid', 'roleUuid'],
      type: 'unique',
      name: 'user_roles_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_roles');
  }
};
