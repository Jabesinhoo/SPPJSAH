// routes/roleRoutes.js
const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const authMiddleware = require('../middleware/authMiddleware');
const { roleValidation, assignRoleValidation } = require('../middleware/validationRole');

// Obtener todos los roles
router.get(
  '/roles',
  authMiddleware.authorize('admin'),
  roleController.getAllRoles
);

// Crear un nuevo rol
router.post(
  '/roles',
  authMiddleware.authorize('admin'),
  roleValidation,
  roleController.createRole
);

// Asignar un rol a un usuario
router.put(
  '/users/:id/role',
  authMiddleware.authorize('admin'),
  assignRoleValidation,
  roleController.assignRole
);

module.exports = router;
