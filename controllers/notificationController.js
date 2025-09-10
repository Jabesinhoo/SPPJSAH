const { Notification, User, sequelize } = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

// Helper: obtiene el usuario actual desde la sesión
function currentUserId(req) {
  return req.session?.userId || req.user?.uuid || null;
}

const createNotificationFromClient = async (req, res) => {
  try {
    const senderId = currentUserId(req);
    if (!senderId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const {
      recipientUsername,
      recipientId,
      type = 'mention',
      message,
      redirectUrl = null,
      metadata = null
    } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'message es requerido' });
    }

    let targetRecipientId = recipientId;

    // Si se proporciona username en lugar de ID, buscarlo
    if (recipientUsername && !recipientId) {
      const recipient = await User.findOne({ where: { username: recipientUsername } });
      if (!recipient) {
        return res.status(404).json({ success: false, error: 'Usuario destinatario no encontrado' });
      }
      targetRecipientId = recipient.uuid;
    }

    const notification = await createNotification({
      recipientId: targetRecipientId,
      senderId,
      type,
      message,
      redirectUrl,
      metadata
    });

    res.json({
      success: true,
      notification,
      message: 'Notificación creada exitosamente'
    });

  } catch (error) {
    logger.error('Error al crear notificación desde cliente:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

const processMentionsFromForm = async (req, res) => {
  try {
    const senderId = currentUserId(req);
    if (!senderId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { text, context = {}, mentions = [] } = req.body;

    let processedMentions = Array.isArray(mentions) ? [...mentions] : [];

    // Si vienen menciones explícitas, usarlas directamente
    if (processedMentions.length === 0 && text) {
      const mentionRegex = /@(\w+)/g;
      let match;
      while ((match = mentionRegex.exec(text)) !== null) {
        processedMentions.push(match[1]);
      }
    }

    if (processedMentions.length === 0) {
      return res.json({ 
        success: true, 
        notificationsCreated: 0,
        message: 'No se encontraron menciones para procesar' 
      });
    }

    // Obtener información del remitente
    const sender = await User.findByPk(senderId);
    const senderName = sender ? sender.username : 'Usuario';

    // Crear contexto completo
    const fullContext = {
      senderName: context.senderName || senderName,
      section: context.section || 'general',
      redirectUrl: context.redirectUrl || null,
      metadata: context.metadata || {}
    };

    // Procesar menciones
    const notifications = await processMentions(
      text || `Mencionado por ${senderName}`, 
      senderId, 
      fullContext
    );

    res.json({
      success: true,
      notificationsCreated: notifications.length,
      message: `Se enviaron ${notifications.length} notificaciones`
    });

  } catch (error) {
    logger.error('Error al procesar menciones desde formulario:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

const getNotificationStats = async (req, res) => {
  try {
    const userId = currentUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const stats = await Notification.findAll({
      where: { recipientId: userId },
      attributes: [
        'type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN "is_read" = false THEN 1 ELSE 0 END')), 'unreadCount']
      ],
      group: ['type'],
      raw: true
    });

    const totalNotifications = await Notification.count({ where: { recipientId: userId } });
    const totalUnread = await Notification.count({ where: { recipientId: userId, isRead: false } });

    res.json({
      success: true,
      stats: { total: totalNotifications, totalUnread, byType: stats }
    });

  } catch (error) {
    logger.error('Error al obtener estadísticas de notificaciones:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

const createNotification = async (notificationData) => {
  try {
    console.log('🎯 Creating notification with data:', notificationData); // DEBUG
    
    const {
      recipientId,
      senderId,
      type = 'mention',
      message,
      redirectUrl = null,
      metadata = null
    } = notificationData;

    // Verificar que el receptor existe
    const recipient = await User.findByPk(recipientId);
    console.log('👤 Recipient found:', recipient ? recipient.username : 'NOT FOUND'); // DEBUG
    
    if (!recipient) throw new Error('Usuario destinatario no encontrado');

    // No crear notificación si es para el mismo usuario
    if (recipientId === senderId) {
      console.log('⏩ Skipping - same user'); // DEBUG
      return null;
    }

    const notification = await Notification.create({
      recipientId,
      senderId,
      type,
      message,
      redirectUrl,
      metadata
    });

    console.log('✅ Notification created:', notification.id); // DEBUG
    return notification;
  } catch (error) {
    console.error('❌ Error creating notification:', error); // DEBUG
    logger.error('Error al crear notificación:', error);
    throw error;
  }
};

const processMentions = async (text, senderId, context = {}) => {
  try {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) mentions.push(match[1]);

    if (mentions.length === 0) return [];

    // Buscar usuarios mencionados
    const mentionedUsers = await User.findAll({
      where: { username: { [Op.in]: mentions } },
      attributes: ['uuid', 'username']
    });

    const toCreate = mentionedUsers.map((user) => ({
      recipientId: user.uuid,
      senderId,
      type: 'mention',
      message: `${context.senderName || 'Alguien'} te mencionó: "${text.length > 100 ? text.substring(0, 100) + '...' : text}"`,
      redirectUrl: context.redirectUrl || null,
      metadata: { originalText: text, context: context.section || 'general', ...(context.metadata || {}) }
    }));

    const notifications = [];
    for (const data of toCreate) {
      const n = await createNotification(data);
      if (n) notifications.push(n);
    }

    return notifications;
  } catch (error) {
    logger.error('Error al procesar menciones:', error);
    throw error;
  }
};

const getUserNotifications = async (req, res) => {
  try {
    const userId = currentUserId(req);
    console.log('🔍 User ID:', userId); // DEBUG
    
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
    
    console.log('📋 Fetching notifications for user:', userId); // DEBUG

    const { count, rows } = await Notification.findAndCountAll({
      where: { recipientId: userId },
      include: [{ 
        model: User, 
        as: 'sender', 
        attributes: ['uuid', 'username']
      }],
      order: [['createdAt', 'DESC']],
      limit,
      offset: (page - 1) * limit
    });

    console.log('📨 Notifications found:', count); // DEBUG
    console.log('📝 Notification rows:', rows.map(r => ({ id: r.id, message: r.message })));
    const totalPages = Math.max(Math.ceil(count / limit), 1);

    // Formato que espera tu frontend
    const notifications = rows.map(n => ({
      id: n.id,
      title: n.type === 'mention' ? 'Mención' : 'Notificación', // ← Tu frontend espera 'title'
      message: n.message,
      type: n.type,
      isRead: n.isRead,
      redirectUrl: n.redirectUrl,
      createdAt: n.createdAt,
      sender: n.sender ? {
        uuid: n.sender.uuid,
        username: n.sender.username
      } : null,
      metadata: n.metadata || null
    }));

    res.json({
      success: true,
      notifications,
      pagination: { 
        currentPage: page, 
        totalPages, 
        totalItems: count, 
        itemsPerPage: limit 
      }
    });
  } catch (error) {
    console.error('❌ Error detailed:', error); // DEBUG
    logger.error('Error al obtener notificaciones:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

const markAsRead = async (req, res) => {
  try {
    const userId = currentUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { notificationId } = req.params;

    const notification = await Notification.findOne({
      where: { id: notificationId, recipientId: userId }
    });

    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notificación no encontrada' });
    }

    if (!notification.isRead) {
      await notification.update({ isRead: true });
    }

    res.json({
      success: true,
      message: 'Notificación marcada como leída',
      redirectUrl: notification.redirectUrl
    });
  } catch (error) {
    logger.error('Error al marcar notificación como leída:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const userId = currentUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    await Notification.update({ isRead: true }, { 
      where: { recipientId: userId, isRead: false } 
    });

    res.json({ success: true, message: 'Todas las notificaciones marcadas como leídas' });
  } catch (error) {
    logger.error('Error al marcar todas como leídas:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const userId = currentUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const count = await Notification.count({ 
      where: { recipientId: userId, isRead: false } 
    });

    res.json({ success: true, unreadCount: count });
  } catch (error) {
    logger.error('Error al obtener contador de notificaciones:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const userId = currentUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { notificationId } = req.params;

    const deleted = await Notification.destroy({ 
      where: { id: notificationId, recipientId: userId } 
    });
    
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Notificación no encontrada' });
    }

    res.json({ success: true, message: 'Notificación eliminada' });
  } catch (error) {
    logger.error('Error al eliminar notificación:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

const getAvailableUsers = async (req, res) => {
  try {
    const currentId = currentUserId(req);
    if (!currentId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const search = (req.query.search || '').trim();

    const whereClause = {
      uuid: { [Op.ne]: currentId }
    };

    if (search) {
      whereClause.username = { [Op.iLike]: `%${search}%` };
    }

    const users = await User.findAll({
      where: whereClause,
      attributes: ['uuid', 'username'],
      order: [['username', 'ASC']],
      limit: 20
    });

    res.json({
      success: true,
      users: users.map(u => ({
        id: u.uuid,
        username: u.username
      }))
    });
  } catch (error) {
    logger.error('Error al obtener usuarios disponibles:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

module.exports = {
  createNotification,
  processMentions,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  getAvailableUsers,
  createNotificationFromClient,
  processMentionsFromForm,
  getNotificationStats
};