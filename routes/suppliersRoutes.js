const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { upload, uploadErrorHandler } = require('../middleware/upload');
const { supplierValidation } = require('../middleware/validation');
const { isAuthenticated } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(isAuthenticated);

// ================== RUTAS API (JSON) ==================
// GET /api/suppliers - Obtener todos los proveedores
router.get('/', supplierController.getAllSuppliersAPI);

// POST /api/suppliers - Crear proveedor
router.post(
  '/',
  upload.single('imagen'),
  supplierValidation,
  supplierController.createSupplierAPI
);

// PUT /api/suppliers/:id - Actualizar proveedor
router.put(
  '/:id',
  upload.single('imagen'),
  supplierValidation,
  supplierController.updateSupplierAPI
);

// DELETE /api/suppliers/:id - Eliminar proveedor
router.delete('/:id', supplierController.deleteSupplierAPI);

router.use(uploadErrorHandler);

module.exports = router;