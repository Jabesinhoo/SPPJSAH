await queryInterface.createTable('product_histories', {
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  productId: {
    type: Sequelize.UUID,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  action: {
    type: Sequelize.ENUM('CREATE', 'UPDATE', 'DELETE', 'BULK_UPDATE', 'REVERT'),
    allowNull: false
  },
  oldData: Sequelize.JSONB,
  newData: Sequelize.JSONB,
  changedFields: Sequelize.JSONB,
  userId: Sequelize.STRING,
  userName: Sequelize.STRING,
  bulkOperationId: Sequelize.STRING,
  createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
  updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
});
