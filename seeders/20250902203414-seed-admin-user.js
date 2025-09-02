'use strict';

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();

    // Buscar rol admin
    const [adminRole] = await queryInterface.sequelize.query(
      `SELECT uuid FROM roles WHERE name = 'admin' LIMIT 1;`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!adminRole) {
      throw new Error('No existe el rol admin. Corre primero el seed de roles.');
    }

    // Buscar si ya existe el usuario
    const [existingUser] = await queryInterface.sequelize.query(
      `SELECT username FROM users WHERE username = 'superadmin' LIMIT 1;`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!existingUser) {
      const passwordHash = await bcrypt.hash('Admin1234!', 10); // 👈 contraseña inicial

      await queryInterface.bulkInsert('users', [{
        uuid: uuidv4(),
        username: 'superadmin',
        email: 'admin@system.com',
        password: passwordHash,
        roleUuid: adminRole.uuid,
        createdAt: now,
        updatedAt: now
      }]);
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', { username: 'superadmin' });
  }
};
