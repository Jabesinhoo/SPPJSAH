const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { upload, uploadErrorHandler } = require('../middleware/upload');
const { supplierValidation } = require('../middleware/validation');
const { isAuthenticated } = require('../middleware/authMiddleware'); // ← CORREGIDO

// Todas las rutas requieren autenticación
router.use(isAuthenticated);

// === RUTAS DE VISTAS (HTML) ===
// GET /suppliers - Página principal de proveedores
router.get('/', supplierController.getAllSuppliers);

router.post(
  '/',
  upload.single('imagen'),
  supplierValidation,
  supplierController.createSupplier
);

router.post(
  '/:id/edit',
  upload.single('imagen'),
  supplierValidation,
  supplierController.updateSupplier
);

// POST /suppliers/:id/delete - Eliminar proveedor (desde formulario)
router.post('/:id/delete', supplierController.deleteSupplier);
router.use(uploadErrorHandler);

module.exports = router;