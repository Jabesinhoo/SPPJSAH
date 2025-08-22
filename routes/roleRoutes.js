// routes/roleRoutes.js
const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const authMiddleware = require('../middleware/authMiddleware'); // You'll need an authentication middleware

// Route to create a new role (e.g., only accessible by an admin)
router.get('/roles', authMiddleware.authorize('admin'), roleController.getAllRoles);

// Route to assign a role to a user
router.put('/users/:id/role', authMiddleware.authorize('admin'), roleController.assignRole);

module.exports = router;