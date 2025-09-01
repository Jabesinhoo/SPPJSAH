const rateLimit = require('express-rate-limit');

// Limitar intentos de login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máx 5 intentos por IP
  message: { error: 'Demasiados intentos de inicio de sesión. Inténtalo más tarde.' },
  standardHeaders: true, // devuelve info en cabeceras RateLimit-*
  legacyHeaders: false
});

module.exports = { loginLimiter };
