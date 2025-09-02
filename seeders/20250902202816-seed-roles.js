'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();

    // Buscar roles existentes
    const roles = await queryInterface.sequelize.query(
      'SELECT name FROM roles',
      { type: Sequelize.QueryTypes.SELECT }
    );
    const existingNames = roles.map(r => r.name);

    const newRoles = [];

    if (!existingNames.includes('admin')) {
      newRoles.push({
        uuid: uuidv4(),
        name: 'admin',
        createdAt: now,
        updatedAt: now
      });
    }

    if (!existingNames.includes('user')) {
      newRoles.push({
        uuid: uuidv4(),
        name: 'user',
        createdAt: now,
        updatedAt: now
      });
    }

    if (newRoles.length > 0) {
      await queryInterface.bulkInsert('roles', newRoles, {});
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('roles', {
      name: ['admin', 'user']
    });
  }
};
