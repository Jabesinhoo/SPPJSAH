const { body, validationResult } = require('express-validator');

exports.transportValidation = [
  body('placa')
    .notEmpty().withMessage('La placa es obligatoria.')
    .isLength({ min: 5 }).withMessage('La placa debe tener al menos 5 caracteres.'),

  body('nombre_conductor')
    .notEmpty().withMessage('El nombre del conductor es obligatorio.')
    .isLength({ min: 3 }).withMessage('El nombre del conductor debe tener al menos 3 caracteres.'),

  body('telefono')
    .notEmpty().withMessage('El teléfono es obligatorio.')
    .matches(/^\d{7,15}$/).withMessage('El teléfono debe contener solo números (7-15 dígitos).'),

  body('tipo_vehiculo')
    .notEmpty().withMessage('El tipo de vehículo es obligatorio.'),

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
