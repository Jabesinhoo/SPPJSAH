const { body, validationResult } = require('express-validator');

exports.outsourceValidation = [
  body('nombre_tecnico')
    .notEmpty().withMessage('El nombre del técnico es obligatorio.')
    .isLength({ min: 3 }).withMessage('El nombre debe tener al menos 3 caracteres.'),

  body('telefono')
    .notEmpty().withMessage('El teléfono es obligatorio.')
    .matches(/^\d{7,15}$/).withMessage('El teléfono debe contener solo números (7-15 dígitos).'),

  body('cc')
    .notEmpty().withMessage('La cédula es obligatoria.')
    .isInt().withMessage('La cédula debe ser numérica.'),

  body('tipo_servicio')
    .custom(value => {
      if (!value || (Array.isArray(value) && value.length === 0)) {
        throw new Error('Debe seleccionar al menos un tipo de servicio.');
      }
      return true;
    }),

  // Capturar errores
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.originalUrl.startsWith('/api')) {
        return res.status(400).json({ errors: errors.array() });
      } else {
        req.flash('error', errors.array().map(err => err.msg).join(', '));
        return res.redirect('back');
      }
    }
    next();
  }
];
