const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const upload = require('../middleware/upload');
const { supplierValidation } = require('../middleware/validation');
const { isAuthenticated } = require('../middleware/authMiddleware'); // ← CORREGIDO

// Todas las rutas requieren autenticación
router.use(isAuthenticated);

// === RUTAS DE VISTAS (HTML) ===
// GET /suppliers - Página principal de proveedores
router.get('/', supplierController.getAllSuppliers);

// === RUTAS API (JSON) ===
// POST /suppliers - Crear proveedor (desde formulario)
router.post('/', upload.single('imagen'), supplierValidation, supplierController.createSupplier);

// POST /suppliers/:id/edit - Editar proveedor (desde formulario)
router.post('/:id/edit', upload.single('imagen'), supplierValidation, supplierController.updateSupplier);

// POST /suppliers/:id/delete - Eliminar proveedor (desde formulario)
router.post('/:id/delete', supplierController.deleteSupplier);

module.exports = router;