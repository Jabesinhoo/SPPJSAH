const express = require('express');
const router = express.Router();
const outsourceController = require('../controllers/outsourceController');
const { isAuthenticated } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(isAuthenticated);

// ================== RUTAS API (JSON) ==================
// GET /api/outsource - Obtener todos los técnicos (JSON)
router.get('/', outsourceController.getAllOutsourceAPI);

// POST /api/outsource - Crear técnico (JSON)
router.post('/', outsourceController.createOutsourceAPI);

// PUT /api/outsource/:id - Actualizar técnico
router.put('/:id', outsourceController.updateOutsourceAPI);

// DELETE /api/outsource/:id - Eliminar técnico
router.delete('/:id', outsourceController.deleteOutsourceAPI);

// ================== RUTAS VISTA (EJS) ==================
// GET /outsource - Renderiza vista con tabla y formulario
router.get('/view', outsourceController.renderOutsourceView);

module.exports = router;
