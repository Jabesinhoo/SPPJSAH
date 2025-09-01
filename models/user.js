// models/user.js
const bcrypt = require('bcrypt');

module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        uuid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            unique: true
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                len: {
                    args: [3, 30],
                    msg: 'El nombre de usuario debe tener entre 3 y 30 caracteres'
                },
                is: {
                    args: /^[a-zA-Z0-9_\-]+$/i,
                    msg: 'El nombre de usuario solo puede contener letras, números, guiones y guiones bajos'
                }
            }
        },
        email: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: false,
            validate: {
                isEmail: {
                    msg: 'El email debe ser válido'
                }
            }
        },

        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        profilePicture: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null
        },
        roleUuid: {
            type: DataTypes.UUID,
            allowNull: false // ✅ consistencia con la asociación
        },
    }, {
        tableName: 'users',
        timestamps: true,
        hooks: {
            beforeCreate: async (user) => {
                if (user.password) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            },
            beforeUpdate: async (user) => {
                if (user.changed('password')) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            }
        }
    });

    // Relaciones
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
