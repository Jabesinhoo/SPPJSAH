const { User, Role } = require('../models');
const bcrypt = require('bcryptjs');

exports.register = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });

        const defaultRole = await Role.findOne({ where: { name: 'user' } });

        if (!defaultRole) {
            return res.status(500).json({ error: 'Default role not found. Please create a "user" role first.' });
        }

        const newUser = await User.create({
            username,
            password: password, 
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
        return res.status(400).json({ error: error.message });
    }
};

exports.login = async (req, res) => {
  try {
    console.log('📥 Login attempt - req.body:', req.body);
    
    const { username, password } = req.body || {};
    
    console.log('🔍 Extracted data:', { username, password: password ? '***' : 'undefined' });
    
    if (!username || !password) {
      console.log('❌ Missing username or password');
      return res.status(400).json({ error: 'Username y password son requeridos.' });
    }

    console.log('🔎 Searching for user:', username);
    const user = await User.findOne({
      where: { username },
      include: [{ model: Role, as: 'role' }]
    });

    if (!user) {
      console.log('❌ User not found:', username);
      return res.status(400).json({ error: 'Credenciales inválidas.' });
    }

    console.log('✅ User found:', { uuid: user.uuid, username: user.username, role: user.role?.name });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      console.log('❌ Password mismatch for user:', username);
      return res.status(400).json({ error: 'Credenciales inválidas.' });
    }

    console.log('✅ Password verified for user:', username);

    req.session.userId = user.uuid;
    req.session.username = user.username;
    req.session.userRole = user.role?.name;

    console.log('✅ Session data set:', {
      userId: req.session.userId,
      username: req.session.username,
      userRole: req.session.userRole
    });

    return res.status(200).json({
      message: 'Sesión iniciada.',
      user: { uuid: user.uuid, username: user.username, role: user.role?.name },
      redirect: '/'
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    return res.status(500).json({ error: 'Error inesperado en el inicio de sesión.' });
  }
};