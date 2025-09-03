const csrf = require('csurf');

// Configurar CSRF con cookies seguras
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

module.exports = csrfProtection;
