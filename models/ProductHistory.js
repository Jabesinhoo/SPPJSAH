module.exports = (sequelize, DataTypes) => {
  const ProductHistory = sequelize.define('ProductHistory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    productId: {
      type: DataTypes.UUID,
      allowNull: false
    },

    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: {
          args: [['CREATE', 'UPDATE', 'DELETE', 'BULK_UPDATE', 'REVERT']],
          msg: 'La acción del historial no es válida'
        }
      }
    },

    oldData: {
      type: DataTypes.JSONB,
      allowNull: true
    },

    newData: {
      type: DataTypes.JSONB,
      allowNull: true
    },

    changedFields: {
      type: DataTypes.JSONB,
      allowNull: true
    },

    userName: {
      type: DataTypes.STRING,
      allowNull: true
    },

    bulkOperationId: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'product_histories',
    timestamps: true
  });

  ProductHistory.associate = function (models) {
    ProductHistory.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product'
    });
  };

  return ProductHistory;
};