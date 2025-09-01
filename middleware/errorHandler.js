// middleware/errorHandler.js
const multer = require('multer');
const { ValidationError } = require('sequelize');

function errorHandler(err, req, res, next) {
  console.error('💥 [GLOBAL ERROR]');
  console.error('📍 Path:', req.path);
  console.error('📦 Method:', req.method);
  console.error('👤 UserID:', req.session?.userId || 'no-session');
  console.error('📝 Error message:', err.message);
  console.error('🧩 Stack:', err.stack);

  // Detectar si la request es JSON o HTML
  const accept = req.get('Accept') || '';
  const wantsJson = req.xhr || accept.includes('application/json') || req.path.startsWith('/api');

  // Manejo de errores específicos
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE'
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

  // Errores generales
  if (wantsJson) {
    return res.status(500).json({ error: err.message || 'Error inesperado' });
  }

  if (typeof req.flash === 'function') {
    req.flash('error', err.message || 'Error inesperado');
  }

  return res.redirect(req.get('referer') || '/registro_inicio');
}

module.exports = errorHandler;
