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

// 🧩 Cargar modelos base
const User = require('./user')(sequelize, DataTypes);
const Role = require('./role')(sequelize, DataTypes);
const Supplier = require('./supplier')(sequelize, DataTypes);
const Product = require('./product')(sequelize, DataTypes);
const ProductHistory = require('./ProductHistory')(sequelize, DataTypes); // 👈 AÑADE ESTA LÍNEA
const Notification = require('./notification')(sequelize, DataTypes);
const SpreadsheetModels = require('./spreadsheet')(sequelize, DataTypes);
const { Spreadsheet, SpreadsheetColumn, SpreadsheetRow, SpreadsheetCell } = SpreadsheetModels;

// 🧠 Registrar asociaciones (esto es importante hacerlo DESPUÉS de cargar todos los modelos)
Object.values(sequelize.models)
  .filter(model => typeof model.associate === 'function')
  .forEach(model => model.associate(sequelize.models));

// ✅ Exportar todos los modelos
module.exports = {
  sequelize,
  Sequelize,
  User,
  Role,
  Supplier,
  Product,
  ProductHistory, // 👈 AGREGA AQUÍ TAMBIÉN
  Notification,
  Spreadsheet,
  SpreadsheetColumn,
  SpreadsheetRow,
  SpreadsheetCell
};
