// routes/authRoutes.js
const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { loginLimiter } = require('../middleware/rateLimit');
const { registerValidation, loginValidation } = require('../middleware/authValidation');

// Middleware para manejar errores de validación
const { validationResult } = require('express-validator');

const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(v => v.run(req)));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(err => err.msg)
      });
    }
    next();
  };
};

/* ==============================
   Registro de usuario
   ============================== */
router.post(
  '/register',
  validate(registerValidation),
  authController.register
);

/* ==============================
   Login de usuario
   ============================== */
router.post(
  '/login',
  loginLimiter,
  validate(loginValidation),
  authController.login
);

/* ==============================
   Logout de usuario
   ============================== */
router.post('/logout', (req, res, next) => {
  if (!req.session.userId) {
    return res.status(400).json({ success: false, message: 'No hay sesión activa' });
  }
  authController.logout(req, res, next);
});

module.exports = router;
