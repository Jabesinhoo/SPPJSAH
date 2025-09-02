// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { User, Role } = require('../models');
const authMiddleware = require('../middleware/authMiddleware');
const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');

// ✅ Importar validaciones centralizadas
const {
  validatePasswordChange,
  validateAssignRole,
  validateIdentifier,
  validateUserSearch
} = require('../middleware/userValidation');

// Middleware genérico para ejecutar validaciones
const validate = (validations) => async (req, res, next) => {
  await Promise.all(validations.map(v => v.run(req)));
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// === Obtener todos los usuarios (para sistema de etiquetado) ===
router.get('/users', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['uuid', 'username'],
      include: [{ model: Role, as: 'role', attributes: ['uuid', 'name'] }],
      order: [['username', 'ASC']]
    });
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Error al obtener usuarios.' });
  }
});

// === Gestión de usuarios (solo admins) ===
router.get('/users/management', authMiddleware.authorize('admin'), async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['uuid', 'username', 'createdAt'],
      include: [{ model: Role, as: 'role', attributes: ['uuid', 'name'] }],
      order: [['username', 'ASC']]
    });
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users for management:', error);
    res.status(500).json({ error: 'Error al obtener usuarios para gestión.' });
  }
});

// === Cambiar contraseña de un usuario (solo admins) ===
router.put(
  '/users/:id/password',
  authMiddleware.authorize('admin'),
  validate(validatePasswordChange),
  async (req, res) => {
    try {
      const userUuid = req.params.id;
      const { newPassword } = req.body;

      const user = await User.findByPk(userUuid);
      if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      await user.save();

      res.status(200).json({ message: 'Contraseña actualizada exitosamente.' });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({ error: 'Error al cambiar la contraseña.' });
    }
  }
);

// === Obtener usuario actual ===
router.get('/users/me', authMiddleware.requireAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.session.userId, {
      attributes: ['uuid', 'username'],
      include: [{ model: Role, as: 'role', attributes: ['uuid', 'name'] }]
    });

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Error al obtener información del usuario.' });
  }
});

// === Obtener usuario específico (por UUID o username) ===
router.get(
  '/users/:identifier',
  authMiddleware.requireAuth,
  validate(validateIdentifier),
  async (req, res) => {
    try {
      const { identifier } = req.params;
      const whereClause = identifier.includes('-')
        ? { uuid: identifier }
        : { username: identifier };

      const user = await User.findOne({
        where: whereClause,
        attributes: ['uuid', 'username', 'createdAt'],
        include: [{ model: Role, as: 'role', attributes: ['uuid', 'name'] }]
      });

      if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

      res.status(200).json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Error al obtener el usuario.' });
    }
  }
);

// === Asignar rol a usuario (solo admins) ===
router.put(
  '/users/:id/role',
  authMiddleware.authorize('admin'),
  validate(validateAssignRole),
  async (req, res) => {
    try {
      const userUuid = req.params.id;
      const { roleUuid } = req.body;

      const user = await User.findByPk(userUuid);
      if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

      const role = await Role.findByPk(roleUuid);
      if (!role) return res.status(404).json({ message: 'Rol no encontrado' });

      await user.update({ roleUuid: role.uuid });

      const updatedUser = await User.findByPk(userUuid, {
        include: [{ model: Role, as: 'role', attributes: ['uuid', 'name'] }],
        attributes: ['uuid', 'username']
      });

      res.status(200).json({ message: 'Rol asignado exitosamente', user: updatedUser });
    } catch (error) {
      console.error('Error assigning role:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// === Buscar usuarios (autocompletado de menciones) ===
router.get(
  '/users/search/:query',
  authMiddleware.requireAuth,
  validate(validateUserSearch),
  async (req, res) => {
    try {
      const { query } = req.params;
      const { Op } = require('sequelize');

      const users = await User.findAll({
        where: { username: { [Op.iLike]: `%${query}%` } },
        attributes: ['uuid', 'username'],
        include: [{ model: Role, as: 'role', attributes: ['name'] }],
        order: [['username', 'ASC']],
        limit: 10
      });

      res.status(200).json(users);
    } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({ error: 'Error al buscar usuarios.' });
    }
  }
);

// === Estadísticas de usuarios (solo admins) ===
router.get('/users/stats/summary', authMiddleware.authorize('admin'), async (req, res) => {
  try {
    const totalUsers = await User.count();
    const usersByRole = await User.findAll({
      attributes: [[User.sequelize.fn('COUNT', User.sequelize.col('User.uuid')), 'count']],
      include: [{ model: Role, as: 'role', attributes: ['name'] }],
      group: ['role.uuid', 'role.name'],
      raw: true
    });

    const stats = {
      totalUsers,
      byRole: usersByRole.map(stat => ({
        role: stat['role.name'] || 'Sin rol',
        count: parseInt(stat.count)
      }))
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas de usuarios.' });
  }
});

module.exports = router;
