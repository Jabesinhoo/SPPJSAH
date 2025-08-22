// models/index.js
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: false,
    }
);

// Cargar modelos
const User = require('./user')(sequelize, DataTypes);
const Product = require('./product')(sequelize, DataTypes);
const Role = require('./role')(sequelize, DataTypes); // ✅ Nueva línea

// Definir asociaciones
Object.values(sequelize.models)
    .filter(model => typeof model.associate === 'function')
    .forEach(model => model.associate(sequelize.models));

module.exports = {
    sequelize,
    Sequelize,
    User,
    Product,
    Role, // ✅ Nueva línea
};