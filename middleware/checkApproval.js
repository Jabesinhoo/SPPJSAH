// middleware/checkApproval.js
const { User } = require('../models');

const checkApproval = async (req, res, next) => {
  if (req.session.userId) {
    try {
      const user = await User.findByPk(req.session.userId);
      if (user && !user.isApproved) {
        // Destruir sesión si el usuario no está aprobado
        req.session.destroy(() => {
          if (req.xhr || req.path.startsWith('/api')) {
            return res.status(403).json({ error: 'Usuario no aprobado' });
          }
          return res.redirect('/registro_inicio');
        });
        return;
      }
    } catch (error) {
      console.error('Error verificando aprobación:', error);
    }
  }
  next();
};

module.exports = checkApproval;