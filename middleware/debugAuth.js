// middleware/debugAuth.js
const { User } = require('../models');

const debugAuth = async (req, res, next) => {
  console.log('=== DEBUG AUTH ===');
  console.log('Session:', req.session);
  
  if (req.session.userId) {
    try {
      const user = await User.findByPk(req.session.userId);
      console.log('User from DB:', {
        id: user.uuid,
        username: user.username,
        isApproved: user.isApproved,
        roleUuid: user.roleUuid
      });
    } catch (error) {
      console.log('Error fetching user:', error);
    }
  }
  console.log('==================');
  next();
};

module.exports = debugAuth;