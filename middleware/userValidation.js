// middleware/userValidation.js
const { body, param } = require('express-validator');

const validatePasswordChange = [
  body('newPassword')
    .isLength({ min: 4 }).withMessage('La contraseña debe tener al menos 4 caracteres')
    .matches(/[0-9]/).withMessage('La contraseña debe incluir al menos un número')
    .matches(/[A-Z]/).withMessage('La contraseña debe incluir al menos una mayúscula')
    .not().isIn(['12345678', 'password', 'qwerty']).withMessage('La contraseña es demasiado común')
];

const validateAssignRole = [
  body('roleUuid')
    .trim()
    .notEmpty().withMessage('El UUID del rol es requerido')
    .isUUID().withMessage('El UUID del rol no es válido')
];

const validateIdentifier = [
  param('identifier')
    .trim()
    .notEmpty().withMessage('El identificador es requerido')
    .isLength({ min: 1, max: 50 }).withMessage('El identificador no puede superar 50 caracteres')
    .matches(/^[a-zA-Z0-9_\-]+$/).withMessage('El identificador contiene caracteres no permitidos')
];

const validateUserSearch = [
  param('query')
    .trim()
    .notEmpty().withMessage('La búsqueda no puede estar vacía')
    .isLength({ min: 1, max: 30 }).withMessage('La búsqueda debe tener entre 1 y 30 caracteres')
    .matches(/^[a-zA-Z0-9_\-]+$/).withMessage('La búsqueda solo puede contener letras, números, guiones y guiones bajos')
];

module.exports = {
  validatePasswordChange,
  validateAssignRole,
  validateIdentifier,
  validateUserSearch
};
