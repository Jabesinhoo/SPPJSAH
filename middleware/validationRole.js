// middleware/validationRole.js
const { body, param, validationResult } = require('express-validator');

// Middleware para manejar los errores de validación
const handleValidation = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((v) => v.run(req)));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  };
};

// Validación al crear un rol
const roleValidation = handleValidation([
  body('name')
    .trim()
    .notEmpty()
    .withMessage('El nombre del rol es requerido')
    .isLength({ min: 3, max: 50 })
    .withMessage('El rol debe tener entre 3 y 50 caracteres')
    .matches(/^[a-zA-Z0-9_\- ]+$/)
    .withMessage('El rol solo puede contener letras, números, guiones y espacios')
]);

// Validación al asignar un rol a un usuario
const assignRoleValidation = handleValidation([
  param('id')
    .notEmpty()
    .withMessage('El ID del usuario es requerido')
    .isUUID()
    .withMessage('El ID del usuario debe ser un UUID válido'),
  body('roleUuid')
    .notEmpty()
    .withMessage('El UUID del rol es requerido')
    .isUUID()
    .withMessage('El UUID del rol debe ser válido')
]);

module.exports = {
  roleValidation,
  assignRoleValidation
};
