'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('product_histories', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true,
        allowNull: false,
      },
      product_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'products', // asegúrate que tu tabla de productos se llame exactamente así
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      action: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      old_data: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      new_data: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      changed_fields: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      user_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      bulk_operation_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    // 🔧 Si tu base no tiene extensión uuid, créala automáticamente
    await queryInterface.sequelize.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('product_histories');
  },
};
