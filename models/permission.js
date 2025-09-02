module.exports = (sequelize, DataTypes) => {
  const Permission = sequelize.define('Permission', {
    uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    action: { type: DataTypes.STRING, allowNull: false }, // ej: "product:create"
    description: { type: DataTypes.STRING }
  });
  Permission.associate = (models) => {
    Permission.belongsToMany(models.Role, {
      through: 'RolePermissions',
      as: 'roles',
      foreignKey: 'permissionUuid'
    });
  };
  return Permission;
};
