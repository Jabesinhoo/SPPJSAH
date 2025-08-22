// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { User, Role } = require('../models');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/users', authMiddleware.authorize('admin'), async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['uuid', 'username'],
            include: [{
                model: Role,
                as: 'role',
                attributes: ['uuid', 'name']
            }]
        });
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching users.' });
    }
});

module.exports = router;