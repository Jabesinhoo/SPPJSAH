// models/ProductHistory.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProductHistory = sequelize.define('ProductHistory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    oldData: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    newData: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    changedFields: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    userName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bulkOperationId: {
      type: DataTypes.STRING,
      allowNull: true,
    }
  }, {
    tableName: 'product_histories',
    timestamps: true,
    underscored: true,
  });

  // Relaciones
  ProductHistory.associate = (models) => {
    ProductHistory.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product',
      onDelete: 'CASCADE',
    });
  };

  return ProductHistory;
};
