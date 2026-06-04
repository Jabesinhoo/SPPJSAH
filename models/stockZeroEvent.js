module.exports = (sequelize, DataTypes) => {
  const StockZeroEvent = sequelize.define('StockZeroEvent', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    wooProductId: {
      type: DataTypes.INTEGER,
      allowNull: false,
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

    previousStock: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'previous_stock'
    },

    currentStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'current_stock'
    },

    stockStatus: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'stock_status'
    },

    eventDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'event_date'
    },

    status: {
      type: DataTypes.ENUM('pending', 'reviewed', 'product_created', 'ignored'),
      allowNull: false,
      defaultValue: 'pending'
    },

    source: {
      type: DataTypes.ENUM('transition_to_zero', 'initial_zero'),
      allowNull: false,
      defaultValue: 'transition_to_zero'
    },

    reviewedBy: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'reviewed_by'
    },

    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'reviewed_at'
    },

    imageUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'image_url'
    },

    permalink: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    price: {
      type: DataTypes.STRING(50),
      allowNull: true
    },

    dateModified: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'date_modified'
    },

    isPurchased: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_purchased'
    },

    purchasedBy: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'purchased_by'
    },

    purchasedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'purchased_at'
    },

    createdProductId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_product_id'
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'stock_zero_events',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['woo_product_id', 'event_date']
      },
      {
        fields: ['sku']
      },
      {
        fields: ['event_date']
      },
      {
        fields: ['status']
      }
    ]
  });

  return StockZeroEvent;
};