module.exports = (sequelize, DataTypes) => {
    const Role = sequelize.define('Role', {
        uuid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            unique: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        }
    }, {
        tableName: 'roles',
        timestamps: true
    });
    return Role;
};