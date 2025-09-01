// Script para limpiar sesiones expiradas (ejecutar periódicamente)
const { sequelize } = require('../models');
const PostgreSQLStore = require('connect-pg-simple')(session);

const cleanup = async () => {
  const store = new PostgreSQLStore({
    conString: process.env.DATABASE_URL
  });
  
  store.cleanup();
  console.log('Sesiones expiradas limpiadas');
};

cleanup();