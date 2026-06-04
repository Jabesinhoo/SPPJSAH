// models/notification.js
module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false
    },

    recipientId: {
      type: DataTypes.UUID,
      allowNull: false
    },

    senderId: {
      type: DataTypes.UUID,
      allowNull: true
    },

    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'mention'
    },

    title: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: 'Notificación'
    },

    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },

    redirectUrl: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    link: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },

    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    tableName: 'notifications',
    timestamps: true,
    indexes: [
      {
        name: 'notifications_recipientId_idx',
        fields: ['recipientId']
      },
      {
        name: 'notifications_senderId_idx',
        fields: ['senderId']
      },
      {
        name: 'notifications_isRead_idx',
        fields: ['isRead']
      },
      {
        name: 'notifications_createdAt_idx',
        fields: ['createdAt']
      }
    ]
  });

  Notification.associate = (models) => {
    Notification.belongsTo(models.User, {
      foreignKey: 'recipientId',
      as: 'recipient'
    });

    Notification.belongsTo(models.User, {
      foreignKey: 'senderId',
      as: 'sender'
    });
  };

  return Notification;
};