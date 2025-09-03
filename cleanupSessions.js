// Script para limpiar sesiones expiradas (ejecutar periódicamente)
const { sequelize } = require('../models');
const PostgreSQLStore = require('connect-pg-simple')(session);
const logger = require('../utils/logger');

const cleanup = async () => {
  const store = new PostgreSQLStore({
    conString: process.env.DATABASE_URL
  });
  
  store.cleanup();
  logger.info('Sesiones expiradas limpiadas');
};

cleanup();