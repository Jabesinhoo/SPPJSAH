// middleware/spreadsheetValidation.js
const { body } = require('express-validator');

const createSpreadsheetValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ max: 255 }).withMessage('El nombre no puede superar 255 caracteres'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('La descripción no puede superar 1000 caracteres')
];

const addColumnValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('El nombre de la columna es requerido')
    .isLength({ max: 100 }).withMessage('El nombre de la columna no puede superar 100 caracteres'),

  body('columnType')
    .optional()
    .isIn(['text', 'number', 'decimal', 'boolean', 'date', 'select', 'email', 'url'])
    .withMessage('Tipo de columna no válido'),

  body('width')
    .optional()
    .isInt({ min: 50, max: 1000 })
    .withMessage('El ancho debe estar entre 50 y 1000 píxeles'),

  body('selectOptions')
    .optional()
    .custom((val, { req }) => {
      if (req.body.columnType === 'select' && (!Array.isArray(val) || val.length === 0)) {
        throw new Error('Las opciones de select deben ser un array con al menos 1 valor');
      }
      return true;
    })
];

const updateCellValidation = [
  body('value')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('El valor no puede superar 2000 caracteres')
];

module.exports = {
  createSpreadsheetValidation,
  addColumnValidation,
  updateCellValidation
};
