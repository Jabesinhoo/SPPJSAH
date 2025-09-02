// routes/spreadsheetRoutes.js
const express = require('express');
const router = express.Router();
const SpreadsheetController = require('../controllers/spreadsheetController');
const { requireAuth } = require('../middleware/authMiddleware');
const { 
  createSpreadsheetValidation, 
  addColumnValidation, 
  updateCellValidation 
} = require('../middleware/spreadsheetValidation');
const { validationResult } = require('express-validator');

// Middleware genérico para ejecutar validaciones
const validate = (validations) => async (req, res, next) => {
  await Promise.all(validations.map(v => v.run(req)));
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Middleware para verificar autenticación en todas las rutas
router.use(requireAuth);

// === RUTAS PARA SPREADSHEETS ===
router.get('/spreadsheets', SpreadsheetController.getAllSpreadsheets);
router.post(
  '/spreadsheets',
  validate(createSpreadsheetValidation),
  SpreadsheetController.createSpreadsheet
);
router.get('/spreadsheets/:id', SpreadsheetController.getSpreadsheet);
router.delete('/spreadsheets/:id', SpreadsheetController.deleteSpreadsheet);

// === RUTAS PARA COLUMNAS ===
router.post(
  '/spreadsheets/:spreadsheetId/columns',
  validate(addColumnValidation),
  SpreadsheetController.addColumn
);
router.delete('/spreadsheets/:spreadsheetId/columns/:columnId', SpreadsheetController.deleteColumn);

// === RUTAS PARA FILAS ===
router.post('/spreadsheets/:spreadsheetId/rows', SpreadsheetController.addRow);
router.delete('/spreadsheets/:spreadsheetId/rows/:rowId', SpreadsheetController.deleteRow);

// === RUTAS PARA CELDAS ===
router.put(
  '/cells/:rowId/:columnId',
  validate(updateCellValidation),
  SpreadsheetController.updateCell
);

module.exports = router;
