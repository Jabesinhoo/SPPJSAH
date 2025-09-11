'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // === Tabla roles ===
    await queryInterface.createTable('roles', {
      uuid: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // === Tabla users ===
    await queryInterface.createTable('users', {
      uuid: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      username: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false
      },
      profilePicture: {
        type: Sequelize.STRING,
        allowNull: true
      },
      roleUuid: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'roles', key: 'uuid' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      status: {
        type: Sequelize.ENUM('pending', 'active', 'suspended'),
        allowNull: false,
        defaultValue: 'pending'
      },
      isApproved: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // === Tabla user_roles (relación muchos a muchos) ===
    await queryInterface.createTable('user_roles', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
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
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.addConstraint('user_roles', {
      fields: ['userUuid', 'roleUuid'],
      type: 'unique',
      name: 'user_roles_unique'
    });

    // === Tabla notifications ===
    await queryInterface.createTable('notifications', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'uuid' },
        onDelete: 'CASCADE'
      },
      sender_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'uuid' },
        onDelete: 'SET NULL'
      },
      message: { type: Sequelize.TEXT, allowNull: false },
      title: { type: Sequelize.STRING, allowNull: true, defaultValue: 'Notificación' },
      metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    // === Tabla session (para connect-pg-simple) ===
    await queryInterface.createTable('session', {
      sid: { type: Sequelize.STRING, primaryKey: true },
      sess: { type: Sequelize.JSON, allowNull: false },
      expire: { type: Sequelize.DATE, allowNull: false }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('session');
    await queryInterface.dropTable('notifications');
    await queryInterface.dropTable('user_roles');
    await queryInterface.dropTable('users');
    await queryInterface.dropTable('roles');
  }
};
