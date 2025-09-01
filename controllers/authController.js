// controllers/authController.js
const { User, Role } = require('../models');
const bcrypt = require('bcrypt');

exports.register = async (req, res) => {
  try {
    const { username, password, email } = req.body;  // 👈 incluir email

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
    }

    const defaultRole = await Role.findOne({ where: { name: 'user' } });
    if (!defaultRole) {
      return res.status(500).json({ error: 'Default role not found. Please create a "user" role first.' });
    }

    const newUser = await User.create({
      username,
      password,
      email,          // 👈 ahora sí existe
      roleUuid: defaultRole.uuid
    });

    req.session.userId = newUser.uuid;
    req.session.username = newUser.username;
    req.session.userRole = defaultRole.name;

    const { password: _omit, ...safe } = newUser.toJSON();
    return res.status(201).json({
      message: 'Usuario registrado con éxito.',
      user: safe,
      redirect: '/'
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'El usuario ya existe' });
    }
    console.error('❌ Error en register:', error);
    return res.status(400).json({ error: error.message });
  }
};


exports.login = async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
    }

    // Buscar usuario por username
    const user = await User.findOne({
      where: { username },
      include: [{ model: Role, as: 'role' }]
    });

    if (!user) {
      return res.status(400).json({ error: 'Credenciales inválidas.' });
    }

    // Verificar contraseña
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(400).json({ error: 'Credenciales inválidas.' });
    }

    // Crear sesión
    req.session.userId = user.uuid;
    req.session.username = user.username;
    req.session.userRole = user.role?.name;

    return res.status(200).json({
      message: 'Sesión iniciada correctamente.',
      user: {
        uuid: user.uuid,
        username: user.username,
        role: user.role?.name
      },
      redirect: '/'
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    return res.status(500).json({ error: 'Error inesperado en el inicio de sesión.' });
  }
};


exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Error al cerrar sesión:', err);
      return res.status(500).json({ error: 'No se pudo cerrar la sesión.' });
    }
    res.clearCookie('connect.sid');
    return res.status(200).json({ message: 'Sesión cerrada con éxito.', redirect: '/registro_inicio' });
  });
};
