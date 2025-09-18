const { body } = require('express-validator');

const supplierValidation = [
  body('marca')
    .optional({ checkFalsy: true })
    .trim()
    .escape()
    .isLength({ max: 100 }).withMessage('La marca no puede tener más de 100 caracteres'),

  body('categoria')
    .trim()
    .escape()
    .notEmpty().withMessage('La categoría es requerida')
    .isLength({ max: 100 }).withMessage('La categoría no puede tener más de 100 caracteres'),

  body('nombre')
    .trim()
    .escape()
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ max: 200 }).withMessage('El nombre no puede tener más de 200 caracteres')
    .custom(async (value, { req }) => {
      const Supplier = require('../models').Supplier;
      const existingSupplier = await Supplier.findOne({ where: { nombre: value } });
      if (existingSupplier && existingSupplier.id !== req.params?.id) {
        throw new Error('Ya existe un proveedor con este nombre');
      }
      
      return true;
    }),

  body('celular')
    .trim()
    .matches(/^[0-9]{10}$/).withMessage('El celular debe tener 10 dígitos'),

  body('correo')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail().withMessage('Debe de ser un correo válido')
    .normalizeEmail(),


  body('ciudad')
    .trim()
    .escape()
    .notEmpty().withMessage('La ciudad es requerida')
    .isLength({ max: 100 }).withMessage('La ciudad no puede tener más de 100 caracteres'),

  body('tipoAsesor')
    .trim()
    .escape()
    .notEmpty().withMessage('El tipo de asesor es requerido')
    .isIn(['Representante de Fabrica', 'Mayorista', 'Asesor general Mayorista', 'Subdistribuidores', 'Minorista', 'Distribuidor', 'Especialista de Marca' ])
    .withMessage('Tipo de asesor inválido'),

  body('nota')
    .optional({ checkFalsy: true })
    .trim()
    .escape()
    .isLength({ max: 500 }).withMessage('La nota no puede tener más de 500 caracteres')
];

module.exports = { supplierValidation };
