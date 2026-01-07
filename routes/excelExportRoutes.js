// routes/excelExportRoutes.js o similar
const express = require('express');
const router = express.Router();
const excelExportController = require('../controllers/excelExportController');
const { isAuthenticated } = require('../middleware/authMiddleware');

// Rutas para exportación a Excel
router.get('/export/preview', isAuthenticated, excelExportController.exportPreview);
router.get('/export', isAuthenticated, excelExportController.exportToExcel);
router.get('/download/:filename', isAuthenticated, excelExportController.downloadExport);
router.get('/list', isAuthenticated, excelExportController.listExports);
router.delete('/delete/:filename', isAuthenticated, excelExportController.deleteExport);

module.exports = router;