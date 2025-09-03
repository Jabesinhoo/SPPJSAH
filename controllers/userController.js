// controllers/userController.js
const { User, Role } = require('../models');
const bcrypt = require('bcrypt');

/* ==============================
   Cambiar Contraseña de un Usuario - CORREGIDO
   ============================== */
exports.changePassword = async (req, res) => {
  try {
    const { userUuid, currentPassword, newPassword } = req.body;

    if (!userUuid || !newPassword) {
      return res.status(400).json({ error: 'Usuario y nueva contraseña son requeridos.' });
    }

    const user = await User.findByPk(userUuid);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    // ✅ Si el usuario cambia su propia contraseña, validar la actual
    if (req.session.userId === user.uuid) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'La contraseña actual es requerida.' });
      }
      
      const ok = await bcrypt.compare(currentPassword, user.password);
      if (!ok) {
        return res.status(400).json({ error: 'La contraseña actual no es válida.' });
      }
    }

    // ✅ CORRECCIÓN: Actualizar usando set y save para que se disparen los hooks
    user.set('password', newPassword);
    await user.save();

    return res.status(200).json({ message: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    console.error('❌ Error en changePassword:', error);
    return res.status(500).json({ error: 'Error al cambiar la contraseña.' });
  }
};

/* ==============================
   Cambiar Rol de un Usuario - CORREGIDO
   ============================== */
exports.assignRole = async (req, res) => {
  try {
    const { userUuid, roleUuid } = req.body;

    if (!userUuid || !roleUuid) {
      return res.status(400).json({ error: 'Usuario y rol son requeridos.' });
    }

    const user = await User.findByPk(userUuid, {
      include: [{ model: Role, as: 'roles' }]
    });
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const role = await Role.findByPk(roleUuid);
    if (!role) {
      return res.status(404).json({ error: 'Rol no encontrado.' });
    }

    // ✅ CORRECCIÓN: Actualizar el roleUuid directamente
    await user.update({ roleUuid: role.uuid });

    // ✅ Recargar el usuario con la información actualizada
    await user.reload({
      include: [{ model: Role, as: 'roles' }]
    });

    // ✅ Si el usuario modificado es el mismo que está logueado, actualizar su sesión
    if (req.session.userId === user.uuid) {
      req.session.userRole = user.roles.name;
    }

    return res.status(200).json({
      message: 'Rol actualizado correctamente',
      user: {
        uuid: user.uuid,
        username: user.username,
        role: user.roles.name
      }
    });
  } catch (error) {
    console.error('❌ Error en assignRole:', error);
    return res.status(500).json({ error: 'Error al asignar rol.' });
  }
};