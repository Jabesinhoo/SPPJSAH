// middleware/errorHandler.js
const multer = require('multer');
const { ValidationError } = require('sequelize');

function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  // Logs
  console.error('💥 [GLOBAL ERROR]');
  console.error('📍 Path:', req.originalUrl);
  console.error('📦 Method:', req.method);
  console.error('👤 UserID:', req.session?.userId || 'no-session');
  console.error('📝 Error message:', err.message);
  console.error('🧩 Stack:', err.stack);

  const accept = req.get('Accept') || '';
  const wantsJson = req.xhr || accept.includes('application/json') || req.path.startsWith('/api');

  // Multer errors
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? 'El archivo es demasiado grande (máx 2MB)'
      : 'Error en la subida de archivos';
    return wantsJson
      ? res.status(400).json({ success: false, code: 'UPLOAD_ERROR', message: msg })
      : res.status(400).render('error', { error: msg });
  }

  // Sequelize validation errors
  if (err instanceof ValidationError) {
    const msg = err.errors.map(e => e.message).join(', ');
    return wantsJson
      ? res.status(400).json({ success: false, code: 'VALIDATION_ERROR', message: msg })
      : res.status(400).render('error', { error: msg });
  }

  // General errors
  if (wantsJson) {
    return res.status(status).json({
      success: false,
      code: 'SERVER_ERROR',
      message: err.message || 'Error inesperado',
      path: req.originalUrl,
      timestamp: new Date().toISOString()
    });
  }

  if (typeof req.flash === 'function') {
    req.flash('error', err.message || 'Error inesperado');
  }

  return res.redirect(req.get('referer') || '/registro_inicio');
}

module.exports = errorHandler;
