// routes/authRoutes.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const authController = require('../controllers/authController');
const { loginLimiter } = require('../middleware/rateLimit');

// Middleware para manejar errores de validación
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(v => v.run(req)));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  };
};

/* ==============================
   Registro de usuario
   ============================== */
router.post(
  '/register',
  validate([
    body('username')
      .trim()
      .escape()
      .isLength({ min: 3, max: 30 })
      .withMessage('El usuario debe tener entre 3 y 30 caracteres')
      .matches(/^[a-zA-Z0-9_\-]+$/)
      .withMessage('El usuario solo puede contener letras, números, guiones y guiones bajos'),

    body('email')
      .optional({ checkFalsy: true })
      .normalizeEmail()
      .isEmail()
      .withMessage('Debe ser un email válido'),

    body('password')
      .isLength({ min: 8 })
      .withMessage('La contraseña debe tener al menos 8 caracteres')
      .matches(/[0-9]/)
      .withMessage('Debe incluir al menos un número')
      .matches(/[A-Z]/)
      .withMessage('Debe incluir al menos una letra mayúscula')
      .not()
      .isIn(['12345678', 'password', 'qwerty'])
      .withMessage('La contraseña es demasiado común')
  ]),
  authController.register
);


/* ==============================
   Login de usuario
   ============================== */
// Login SOLO con usuario + contraseña
router.post(
  '/login',
  loginLimiter,
  validate([
    body('username')
      .trim()
      .escape()
      .notEmpty()
      .withMessage('El usuario es requerido')
      .isLength({ min: 3 })
      .withMessage('El usuario debe tener al menos 3 caracteres'),

    body('password')
      .notEmpty()
      .withMessage('La contraseña es requerida')
  ]),
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
