// middleware/notificationMiddleware.js
const { Notification } = require('../models');
const logger = require('../utils/logger');

/**
 * Middleware para agregar contador de notificaciones no leídas a las vistas
 */
const addNotificationCount = async (req, res, next) => {
  try {
    // Solo aplicar si el usuario está autenticado
    if (req.session && req.session.userId) {
      const unreadCount = await Notification.count({
        where: {
          recipientId: req.session.userId,
          isRead: false
        }
      });

      res.locals.unreadNotifications = unreadCount;
    } else {
      res.locals.unreadNotifications = 0;
    }
  } catch (error) {
    logger.error('Error al obtener contador de notificaciones:', error);
    res.locals.unreadNotifications = 0;
  }
  
  next();
};

module.exports = {
  addNotificationCount
};