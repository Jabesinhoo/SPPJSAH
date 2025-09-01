// controllers/roleController.js
const { Role, User } = require('../models');

// Get all roles
exports.getAllRoles = async (req, res) => {
    try {
        const roles = await Role.findAll({
            attributes: ['uuid', 'name', 'createdAt'],
            order: [['createdAt', 'ASC']]
        });
        res.status(200).json(roles);
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ error: 'Error fetching roles.' });
    }
};

// Create a new role
exports.createRole = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Role name is required' });
        }
        
        const newRole = await Role.create({ name });
        res.status(201).json(newRole);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ error: 'Role already exists' });
        }
        console.error('Error creating role:', error);
        res.status(500).json({ error: error.message });
    }
};
// Assign role to user
exports.assignRole = async (req, res) => {
    try {
        const userUuid = req.params.id; // UUID del usuario desde la URL
        const { roleUuid } = req.body;   // UUID del rol desde el body
        
        console.log('Assigning role:', { userUuid, roleUuid });
        
        // Find user by their UUID
        const user = await User.findByPk(userUuid);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Find role by its UUID
        const role = await Role.findByPk(roleUuid);
        if (!role) {
            return res.status(404).json({ message: 'Role not found' });
        }

        // Set the roleUuid on the user
        await user.update({ roleUuid: role.uuid });
        
        // Return updated user with role
        const updatedUser = await User.findByPk(userUuid, {
            include: [{
                model: Role,
                as: 'role',
                attributes: ['uuid', 'name']
            }],
            attributes: ['uuid', 'username']
        });
        
        res.status(200).json({ 
            message: 'Role assigned successfully', 
            user: updatedUser 
        });
    } catch (error) {
        console.error('Error assigning role:', error);
        res.status(500).json({ error: error.message });
    }
};