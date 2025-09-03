// middleware/errorHandler.js
const multer = require('multer');
const { ValidationError } = require('sequelize');
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error('💥 [GLOBAL ERROR]', {
    path: req.path,
    method: req.method,
    userId: req.session?.userId || 'no-session',
    message: err.message,
    stack: err.stack,
  });

  const accept = req.get('Accept') || '';
  const wantsJson = req.xhr || accept.includes('application/json') || req.path.startsWith('/api');

  if (err instanceof multer.MulterError) {
    const msg =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'El archivo es demasiado grande (máx 2MB)'
        : 'Error en la subida de archivos';
    return wantsJson
      ? res.status(400).json({ error: msg })
      : res.status(400).render('error', { error: msg });
  }

  if (err instanceof ValidationError) {
    const msg = err.errors.map(e => e.message).join(', ');
    return wantsJson
      ? res.status(400).json({ error: msg })
      : res.status(400).render('error', { error: msg });
  }

  if (wantsJson) {
    return res.status(500).json({ error: err.message || 'Error inesperado' });
  }

  if (typeof req.flash === 'function') {
    req.flash('error', err.message || 'Error inesperado');
  }

  return res.redirect(req.get('referer') || '/registro_inicio');
}

module.exports = errorHandler;
