// models/user.js
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        uuid: { // ✅ Agrega o verifica este campo
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            unique: true
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        roleUuid: {
            type: DataTypes.UUID,
        },
    }, {
        tableName: 'users',
        timestamps: true,
        hooks: {
            beforeCreate: async (user) => {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            },
        },
    });

    User.associate = (models) => {
        User.belongsTo(models.Role, {
            foreignKey: {
                name: 'roleUuid',
                allowNull: false,
            },
            as: 'role'
        });
    };
    return User;
};