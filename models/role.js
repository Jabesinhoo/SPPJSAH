// models/role.js
module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define('Role', {
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    }
  }, {
    tableName: 'roles',
    timestamps: true
  });

  Role.associate = (models) => {
    Role.belongsToMany(models.User, {
      through: 'user_roles',
      foreignKey: 'roleUuid',
      otherKey: 'userUuid',
      as: 'users'
    });
  };

  return Role;
};
