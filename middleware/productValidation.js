// middleware/productValidation.js
const { body } = require('express-validator');

const productValidation = [
  body('SKU')
    .trim()
    .notEmpty().withMessage('El SKU es requerido')
    .isLength({ max: 50 }).withMessage('El SKU no puede superar 50 caracteres')
    .matches(/^[a-zA-Z0-9\-_.]+$/).withMessage('El SKU solo puede contener letras, números, guiones y puntos'),

  body('name')
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ max: 200 }).withMessage('El nombre no puede superar 200 caracteres'),

  body('quantity')
    .optional()
    .isInt({ min: 0 }).withMessage('La cantidad debe ser un número entero mayor o igual a 0'),

  body('importance')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('La importancia debe estar entre 1 y 5'),

  body('purchasePrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('El precio de compra debe ser un número positivo'),

  body('supplier')
    .optional()
    .trim()
    .isLength({ max: 150 }).withMessage('El proveedor no puede superar 150 caracteres'),

  body('brand')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('La marca no puede superar 100 caracteres'),

  body('category')
    .optional()
    .isIn([
      'Faltantes',
      'Bajo Pedido',
      'Agotados con el Proveedor',
      'Demasiadas Existencias',
      'Realizado'
    ]).withMessage('Categoría no válida'),

  body('notes')
    .optional()
    .isLength({ max: 1000 }).withMessage('La nota no puede superar 1000 caracteres')
];

module.exports = { productValidation };
