// models/wooStockSnapshot.js
module.exports = (sequelize, DataTypes) => {
  const WooStockSnapshot = sequelize.define('WooStockSnapshot', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    wooProductId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      field: 'woo_product_id'
    },

    sku: {
      type: DataTypes.STRING(100),
      allowNull: false
    },

    name: {
      type: DataTypes.STRING(500),
      allowNull: false
    },

    lastStock: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'last_stock'
    },

    lastStockStatus: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'last_stock_status'
    },

    lastCheckedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'last_checked_at'
    }
  }, {
    tableName: 'woo_stock_snapshots',
    timestamps: true,
    indexes: [
      { fields: ['woo_product_id'] },
      { fields: ['sku'] }
    ]
  });

  return WooStockSnapshot;
};