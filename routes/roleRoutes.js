// routes/roleRoutes.js
const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const authMiddleware = require('../middleware/authMiddleware');

// Route to get all roles
router.get('/roles', authMiddleware.authorize('admin'), roleController.getAllRoles);

// Route to create a new role
router.post('/roles', authMiddleware.authorize('admin'), roleController.createRole);

// Route to assign a role to a user
router.put('/users/:id/role', authMiddleware.authorize('admin'), roleController.assignRole);

module.exports = router;