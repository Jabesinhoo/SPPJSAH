const { User, Role } = require('../models');
const bcrypt = require('bcrypt');
const loginAttempts = new Map();

exports.register = async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // Validación de campos requeridos
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Usuario y contraseña son obligatorios.' });
    }

    // Verificar duplicados antes de crear
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'El nombre de usuario ya está en uso.' });
    }

    if (email) {
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) {
        return res.status(409).json({ success: false, message: 'El correo electrónico ya está en uso.' });
      }
    }

    // Obtener rol por defecto
    const defaultRole = await Role.findOne({ where: { name: 'user' } });
    if (!defaultRole) {
      return res.status(500).json({ success: false, message: 'Rol por defecto no encontrado. Crea el rol "user".' });
    }

    // Crear usuario
    const newUser = await User.create({
      username,
      password,   // bcrypt se ejecuta en hook del modelo (beforeCreate/beforeUpdate)
      email: email || null,
      roleUuid: defaultRole.uuid
    });

    // ✅ REGENERAR SESIÓN para prevenir session fixation
    req.session.regenerate((err) => {
      if (err) {
        console.error('❌ Error al regenerar sesión en registro:', err);
        return res.status(500).json({ success: false, message: 'Error en el registro.' });
      }

      // Crear nueva sesión
      req.session.userId = newUser.uuid;
      req.session.username = newUser.username;
      req.session.userRole = defaultRole.name;

      const { password: _omit, ...safe } = newUser.toJSON();
      return res.status(201).json({
        success: true,
        message: 'Usuario registrado con éxito.',
        user: safe,
        redirect: '/'
      });
    });

  } catch (error) {
    console.error('❌ Error en register:', error);
    return res.status(500).json({ success: false, message: 'Error en el registro.', details: error.message });
  }
};


// fuera del export (arriba en el archivo)

exports.login = async (req, res) => {
  try {
    const username = (req.body.username || '').trim();
    const password = req.body.password || '';
    const now = Date.now();

    // 🔎 Control de intentos fallidos por usuario
    const attempts = loginAttempts.get(username) || { count: 0, lastAttempt: now };

    if (now - attempts.lastAttempt > 1 * 60 * 1000) {
      // reinicia contador si pasaron 15 minutos
      attempts.count = 0;
    }

    attempts.count++;
    attempts.lastAttempt = now;
    loginAttempts.set(username, attempts);

    if (attempts.count > 5) {
      console.warn(`⚠️ Usuario bloqueado temporalmente: ${username}`);
      return res.status(429).json({
        error: 'Demasiados intentos fallidos de inicio de sesión para este usuario. Intenta más tarde.'
      });
    }

    // === tu lógica de login normal ===
    const user = await User.findOne({
      where: { username },
      include: [{ model: Role, as: 'roles', attributes: ['name'] }]
    });

    if (!user) {
      return res.status(400).json({ error: 'Credenciales inválidas.' });
    }

    if (!user.isApproved) {
      return res.status(403).json({ error: 'Tu cuenta está pendiente de aprobación por un administrador.' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(400).json({ error: 'Credenciales inválidas.' });
    }

    // ✅ Si el login fue exitoso → resetear contador
    loginAttempts.delete(username);

    req.session.regenerate((err) => {
      if (err) {
        return res.status(500).json({ error: 'Error en el inicio de sesión.' });
      }

      req.session.userId = user.uuid;
      req.session.username = user.username;
      req.session.userRole = user.roles?.name;
      req.session.isApproved = user.isApproved;

      return res.status(200).json({
        message: 'Sesión iniciada correctamente.',
        user: {
          uuid: user.uuid,
          username: user.username,
          role: user.roles?.name,
          email: user.email || null,
          isApproved: user.isApproved
        },
        redirect: '/'
      });
    });

  } catch (err) {
    console.error('❌ Login error:', err);
    return res.status(500).json({ error: 'Error inesperado en el inicio de sesión.' });
  }
};





exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error al cerrar sesión:', err);
      return res.status(500).json({ error: 'No se pudo cerrar la sesión.' });
    }
    res.clearCookie('connect.sid');
    return res.status(200).json({ success: true, message: 'Sesión cerrada con éxito.', redirect: '/registro_inicio' });
  });
};
