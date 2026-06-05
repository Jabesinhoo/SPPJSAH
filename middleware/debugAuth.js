// middleware/debugAuth.js
const { User } = require('../models');

const debugAuth = async (req, res, next) => {
  
  
  if (req.session.userId) {
    try {
      const user = await User.findByPk(req.session.userId);
      console.log('', {
        id: user.uuid,
        username: user.username,
        isApproved: user.isApproved,
        roleUuid: user.roleUuid
      });
    } catch (error) {
      console.log('Error fetching user:', error);
    }
  }
  next();
};

module.exports = debugAuth;