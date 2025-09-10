const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'uuid'
    },
    // ✅ CORREGIDO: mapea a 'user_id' (nombre real en BD)
    recipientId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',          // ← NOMBRE REAL EN LA BD
      references: {
        model: 'users',
        key: 'uuid'
      }
    },
    senderId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'sender_id',
      references: {
        model: 'users',
        key: 'uuid'
      }
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'mention',
      validate: {
        isIn: [['mention', 'system', 'product', 'supplier', 'general']]
      }
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_read'
    },
    redirectUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'link'  // ← En tu BD la columna se llama 'link'
    },
    sourceType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'source_type'
    },
    sourceId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'source_id'
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at'
    }
  }, {
    tableName: 'notifications',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'], name: 'notifications_user_id' },
      { fields: ['sender_id'], name: 'notifications_sender_id' },
      { fields: ['is_read'], name: 'notifications_is_read' },
      { fields: ['created_at'], name: 'notifications_created_at' },
      { fields: ['type'], name: 'notifications_type' }
    ]
  });

  Notification.associate = (models) => {
    Notification.belongsTo(models.User, {
      foreignKey: 'recipientId',   // ← nombre en el modelo
      targetKey: 'uuid',
      as: 'recipient'
    });
    Notification.belongsTo(models.User, {
      foreignKey: 'senderId',
      targetKey: 'uuid',
      as: 'sender'
    });
  };

  return Notification;
};