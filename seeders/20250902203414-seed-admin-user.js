'use strict';

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    const [adminRole] = await queryInterface.sequelize.query(
      `SELECT uuid FROM roles WHERE name = 'admin' LIMIT 1;`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!adminRole) {
      throw new Error('No existe el rol admin. Corre primero el seed de roles.');
    }

    const [existingUser] = await queryInterface.sequelize.query(
      `SELECT uuid, username FROM users WHERE username = 'superadmin' LIMIT 1;`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const passwordHash = await bcrypt.hash('Admin1234!', 10);

    if (!existingUser) {
      await queryInterface.bulkInsert('users', [{
        uuid: uuidv4(),
        username: 'superadmin',
        email: 'admin@system.com',
        password: passwordHash,
        roleUuid: adminRole.uuid,
        isApproved: true,
        status: 'approved',
        createdAt: now,
        updatedAt: now
      }]);

      console.log('✅ Usuario superadmin creado correctamente.');
    } else {
      await queryInterface.bulkUpdate(
        'users',
        {
          password: passwordHash,
          roleUuid: adminRole.uuid,
          isApproved: true,
          status: 'approved',
          updatedAt: now
        },
        {
          username: 'superadmin'
        }
      );

      console.log('✅ Usuario superadmin actualizado y aprobado correctamente.');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', { username: 'superadmin' });
  }
};