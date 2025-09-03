// middleware/authValidation.js
const { body } = require('express-validator');

const registerValidation = [
  body('username')
    .trim().escape()
    .isLength({ min: 3, max: 30 }).withMessage('El usuario debe tener entre 3 y 30 caracteres')
    .matches(/^[a-zA-Z0-9_\-]+$/).withMessage('El usuario solo puede contener letras, números, guiones y guiones bajos'),
  
  body('email')
    .optional({ checkFalsy: true })
    .normalizeEmail()
    .isEmail().withMessage('Debe ser un email válido'),

  body('password')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/[0-9]/).withMessage('Debe incluir al menos un número')
    .matches(/[A-Z]/).withMessage('Debe incluir al menos una mayúscula')
    .not().isIn(['12345678', 'password', 'qwerty']).withMessage('La contraseña es demasiado común')
];

const loginValidation = [
  body('username')
    .trim().escape()
    .notEmpty().withMessage('El usuario es requerido')
    .isLength({ min: 3 }).withMessage('El usuario debe tener al menos 3 caracteres'),

  body('password')
    .notEmpty().withMessage('La contraseña es requerida')
];

module.exports = { registerValidation, loginValidation };
