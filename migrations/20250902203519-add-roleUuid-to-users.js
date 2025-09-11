'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'roleUuid', {
      type: Sequelize.UUID,
      allowNull: true, // 👉 primero permitimos nulos
      references: {
        model: 'roles',
        key: 'uuid'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    // Asignar rol "user" por defecto a todos los usuarios existentes
    const [results] = await queryInterface.sequelize.query(
      `SELECT uuid FROM roles WHERE name = 'user' LIMIT 1;`
    );
    if (results.length > 0) {
      const userRoleUuid = results[0].uuid;
      await queryInterface.sequelize.query(
        `UPDATE users SET "roleUuid" = '${userRoleUuid}' WHERE "roleUuid" IS NULL;`
      );
    }

    // Ahora forzamos a NOT NULL
    await queryInterface.changeColumn('users', 'roleUuid', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'uuid'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'roleUuid');
  }
};
