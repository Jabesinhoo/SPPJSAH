// migrations/20240902000100-create-user-roles.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Crear tabla intermedia user_roles
    await queryInterface.createTable('user_roles', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      userUuid: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'uuid'
        },
        onDelete: 'CASCADE'
      },
      roleUuid: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'roles',
          key: 'uuid'
        },
        onDelete: 'CASCADE'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // 2. Crear índice único para evitar duplicados (user + role)
    await queryInterface.addConstraint('user_roles', {
      fields: ['userUuid', 'roleUuid'],
      type: 'unique',
      name: 'unique_user_role'
    });

    // 3. Eliminar columna roleUuid de la tabla users (si existe)
    const table = await queryInterface.describeTable('users');
    if (table.roleUuid) {
      await queryInterface.removeColumn('users', 'roleUuid');
    }
  },

  async down(queryInterface, Sequelize) {
    // 1. Agregar de nuevo la columna roleUuid en users
    await queryInterface.addColumn('users', 'roleUuid', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'roles',
        key: 'uuid'
      },
      onDelete: 'SET NULL'
    });

    // 2. Eliminar tabla user_roles
    await queryInterface.dropTable('user_roles');
  }
};
