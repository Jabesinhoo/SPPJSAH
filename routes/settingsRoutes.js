// routes/settingsRoutes.js - Nuevo archivo
const express = require('express');
const router = express.Router();
const { User } = require('../models');
const authMiddleware = require('../middleware/authMiddleware');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de multer para subir imágenes
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'public/uploads/profile-pictures';
        // Crear directorio si no existe
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Nombre único para el archivo
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + req.session.userId + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB límite
    },
    fileFilter: function (req, file, cb) {
        // Solo permitir imágenes
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos de imagen'), false);
        }
    }
});

// Obtener información del usuario para la página de ajustes
router.get('/', authMiddleware.requireAuth, async (req, res) => {
    try {
        const user = await User.findByPk(req.session.userId, {
            attributes: ['uuid', 'username', 'profilePicture', 'createdAt'],
            include: [{
                model: Role,
                as: 'role',
                attributes: ['uuid', 'name']
            }]
        });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        res.status(200).json(user);
    } catch (error) {
        logger.error('Error fetching user settings:', error);
        res.status(500).json({ error: 'Error al obtener información del usuario.' });
    }
});

// Cambiar contraseña del usuario actual
router.put('/password', authMiddleware.requireAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'La contraseña actual y la nueva contraseña son obligatorias.' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
        }

        const user = await User.findByPk(req.session.userId);
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        // Verificar contraseña actual
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'La contraseña actual es incorrecta.' });
        }

        // Actualizar contraseña
        user.password = newPassword;
        await user.save();

        res.status(200).json({ message: 'Contraseña actualizada exitosamente.' });
    } catch (error) {
        logger.error('Error changing password:', error);
        res.status(500).json({ error: 'Error al cambiar la contraseña.' });
    }
});

// Cambiar nombre de usuario
router.put('/username', authMiddleware.requireAuth, async (req, res) => {
    try {
        const { newUsername } = req.body;
        
        if (!newUsername || newUsername.trim().length < 3) {
            return res.status(400).json({ error: 'El nuevo nombre de usuario debe tener al menos 3 caracteres.' });
        }

        const user = await User.findByPk(req.session.userId);
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        // Verificar si el nuevo nombre de usuario ya existe
        const existingUser = await User.findOne({ where: { username: newUsername } });
        if (existingUser && existingUser.uuid !== user.uuid) {
            return res.status(400).json({ error: 'El nombre de usuario ya está en uso.' });
        }

        // Actualizar nombre de usuario
        user.username = newUsername;
        await user.save();

        // Actualizar sesión
        req.session.username = newUsername;

        res.status(200).json({ 
            message: 'Nombre de usuario actualizado exitosamente.',
            newUsername: newUsername
        });
    } catch (error) {
        logger.error('Error changing username:', error);
        res.status(500).json({ error: 'Error al cambiar el nombre de usuario.' });
    }
});

// Subir/actualizar foto de perfil
router.post('/profile-picture', authMiddleware.requireAuth, upload.single('profilePicture'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se ha subido ninguna imagen.' });
        }

        const user = await User.findByPk(req.session.userId);
        if (!user) {
            // Eliminar archivo subido si el usuario no existe
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        // Eliminar la imagen anterior si existe
        if (user.profilePicture) {
            const oldImagePath = path.join('public', user.profilePicture);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }

        // Guardar la ruta relativa de la nueva imagen
        const relativePath = req.file.path.replace('public', '');
        user.profilePicture = relativePath;
        await user.save();

        res.status(200).json({ 
            message: 'Foto de perfil actualizada exitosamente.',
            profilePicture: relativePath
        });
    } catch (error) {
        logger.error('Error uploading profile picture:', error);
        res.status(500).json({ error: 'Error al subir la foto de perfil.' });
    }
});

// Eliminar foto de perfil
router.delete('/profile-picture', authMiddleware.requireAuth, async (req, res) => {
    try {
        const user = await User.findByPk(req.session.userId);
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        // Eliminar la imagen si existe
        if (user.profilePicture) {
            const imagePath = path.join('public', user.profilePicture);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        // Limpiar el campo profilePicture
        user.profilePicture = null;
        await user.save();

        res.status(200).json({ message: 'Foto de perfil eliminada exitosamente.' });
    } catch (error) {
        logger.error('Error deleting profile picture:', error);
        res.status(500).json({ error: 'Error al eliminar la foto de perfil.' });
    }
});

module.exports = router;