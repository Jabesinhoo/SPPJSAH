const { body } = require('express-validator');

const supplierValidation = [
    body('marca')
        .notEmpty()
        .withMessage('La marca es requerida')
        .isLength({ max: 100 })
        .withMessage('La marca no puede tener más de 100 caracteres'),
    
    body('categoria')
        .notEmpty()
        .withMessage('La categoría es requerida')
        .isLength({ max: 100 })
        .withMessage('La categoría no puede tener más de 100 caracteres'),
    
    body('nombre')
        .notEmpty()
        .withMessage('El nombre es requerido')
        .isLength({ max: 200 })
        .withMessage('El nombre no puede tener más de 200 caracteres'),
    
    body('celular')
        .notEmpty()
        .withMessage('El celular es requerido')
        .matches(/^[0-9]{10}$/)
        .withMessage('El celular debe tener 10 dígitos'),
    
    body('ciudad')
        .notEmpty()
        .withMessage('La ciudad es requerida')
        .isLength({ max: 100 })
        .withMessage('La ciudad no puede tener más de 100 caracteres'),
    
    body('nota')
        .optional()
        .isLength({ max: 500 })
        .withMessage('La nota no puede tener más de 500 caracteres')
];

module.exports = { supplierValidation };