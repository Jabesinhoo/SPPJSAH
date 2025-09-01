const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { uploadMiddleware } = require('../middleware/upload'); // ✅ usar el middleware mejorado
const { supplierValidation } = require('../middleware/validation');
const { isAuthenticated } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(isAuthenticated);

// === RUTAS DE VISTAS (HTML) ===
router.get('/', supplierController.getAllSuppliers);

// === RUTAS API (JSON) ===
// Crear proveedor con imagen segura
router.post(
  '/',
  (req, res, next) => { req.uploadType = 'suppliers'; next(); }, // 📌 carpeta destino
  uploadMiddleware('imagen', 1), 
  supplierValidation, 
  supplierController.createSupplier
);

// Editar proveedor con imagen segura
router.post(
  '/:id/edit',
  (req, res, next) => { req.uploadType = 'suppliers'; next(); },
  uploadMiddleware('imagen', 1),
  supplierValidation,
  supplierController.updateSupplier
);

// Eliminar proveedor (y su imagen asociada si existe)
router.post('/:id/delete', supplierController.deleteSupplier);

module.exports = router;
