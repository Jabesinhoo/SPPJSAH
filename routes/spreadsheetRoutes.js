const express = require('express');
const router = express.Router();
const SpreadsheetController = require('../controllers/spreadsheetController');
const { requireAuth } = require('../middleware/authMiddleware');

// Middleware para verificar autenticación en todas las rutas
router.use(requireAuth);

// Rutas para spreadsheets
router.get('/spreadsheets', SpreadsheetController.getAllSpreadsheets);
router.post('/spreadsheets', SpreadsheetController.createSpreadsheet);
router.get('/spreadsheets/:id', SpreadsheetController.getSpreadsheet);
router.delete('/spreadsheets/:id', SpreadsheetController.deleteSpreadsheet);

// Rutas para columnas
router.post('/spreadsheets/:spreadsheetId/columns', SpreadsheetController.addColumn);
router.delete('/spreadsheets/:spreadsheetId/columns/:columnId', SpreadsheetController.deleteColumn);

// Rutas para filas
router.post('/spreadsheets/:spreadsheetId/rows', SpreadsheetController.addRow);
router.delete('/spreadsheets/:spreadsheetId/rows/:rowId', SpreadsheetController.deleteRow);

// Rutas para celdas
router.put('/cells/:rowId/:columnId', SpreadsheetController.updateCell);

module.exports = router;