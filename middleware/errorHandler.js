// middleware/errorHandler.js
const multer = require('multer');
const { ValidationError } = require('sequelize');
const logger = require('../utils/logger');

// Helper function para detectar si la petición quiere JSON
function wantsJson(req) {
  const accept = req.get('Accept') || '';
  return req.xhr || accept.includes('application/json') || req.path.startsWith('/api');
}

function errorHandler(err, req, res, next) {
  logger.error('💥 [GLOBAL ERROR]', {
    path: req.path,
    method: req.method,
    userId: req.session?.userId || 'no-session',
    message: err.message,
    stack: err.stack,
  });

  if (err instanceof multer.MulterError) {
    const msg =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'El archivo es demasiado grande (máx 2MB)'
        : 'Error en la subida de archivos';
    
    return wantsJson(req)
      ? res.status(400).json({ error: msg })
      : res.status(400).render('error', { 
          errorCode: 400,
          errorMessage: msg,
          title: 'Error de Subida'
        });
  }

  if (err instanceof ValidationError) {
    const msg = err.errors.map(e => e.message).join(', ');
    return wantsJson(req)
      ? res.status(400).json({ error: msg })
      : res.status(400).render('error', { 
          errorCode: 400,
          errorMessage: msg,
          title: 'Error de Validación'
        });
  }

  // Establecer código de error por defecto
  const statusCode = err.statusCode || err.status || 500;

  if (wantsJson(req)) {
    return res.status(statusCode).json({
      error: err.message || 'Error inesperado',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }

  // ✅ Usar la vista unificada de error
  res.status(statusCode).render('error', {
    title: `Error ${statusCode}`,
    errorCode: statusCode,
    errorMessage: err.message,
    errorStack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}

module.exports = errorHandler;