// models/userRole.js
module.exports = (sequelize, DataTypes) => {
  const UserRole = sequelize.define('UserRole', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    userUuid: {
      type: DataTypes.UUID,
      allowNull: false
    },
    roleUuid: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    tableName: 'user_roles',
    timestamps: true
  });

  return UserRole;
};
