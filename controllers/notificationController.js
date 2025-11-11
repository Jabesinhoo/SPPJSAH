const { Notification, User, sequelize } = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

// Helper: obtiene el usuario actual desde la sesión
function currentUserId(req) {
  return req.session?.userId || req.user?.uuid || null;
}

function buildSpecificRedirectUrl(context) {
  let baseUrl = context.redirectUrl || '/';
  
  const effectiveMetadata = context.metadata || {};
  
  // Separar hash del baseUrl si existe
  let urlWithoutHash = baseUrl;
  let existingHash = '';
  
  if (baseUrl.includes('#')) {
    [urlWithoutHash, existingHash] = baseUrl.split('#');
  }
  
  // Agregar parámetros para redirección específica - MÁS CONSERVADOR
  const params = new URLSearchParams();
  params.append('_nt', Date.now());
  
  let hasQueryParams = false;
  
  // SOLO parámetros esenciales con nombres cortos
  if (effectiveMetadata.targetElement) {
    params.append('t', effectiveMetadata.targetElement);
    hasQueryParams = true;
  }
  
  if (effectiveMetadata.productId) {
    params.append('p', effectiveMetadata.productId);
    hasQueryParams = true;
  }
  
  if (effectiveMetadata.mentionType) {
    params.append('mt', effectiveMetadata.mentionType);
    hasQueryParams = true;
  }
  
  // LIMITAR texto a mostrar (máximo 30 caracteres)
  if (effectiveMetadata.highlightText) {
    const shortText = effectiveMetadata.highlightText.substring(0, 30);
    const encodedText = encodeURIComponent(shortText);
    params.append('ht', encodedText);
    hasQueryParams = true;
  }
  
  const queryString = params.toString();
  
  // Construir URL final
  let finalUrl = urlWithoutHash;
  
  if (hasQueryParams) {
    const separator = urlWithoutHash.includes('?') ? '&' : '?';
    finalUrl += separator + queryString;
  }
  
  // Agregar hash
  if (effectiveMetadata.targetElement) {
    finalUrl += '#' + effectiveMetadata.targetElement;
  } else if (existingHash) {
    finalUrl += '#' + existingHash;
  }
  
  // ✅ LIMITAR longitud total de URL
  if (finalUrl.length > 500) {
    console.warn('⚠️ URL muy larga, truncando:', finalUrl.length);
    finalUrl = finalUrl.substring(0, 500);
  }
  
  console.log('🚀 URL FINAL (optimizada):', finalUrl.length, 'caracteres');
  return finalUrl;
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

    console.log('🔍 DEBUG processMentionsFromForm - DATOS RECIBIDOS:', {
      textLength: text?.length,
      context: context,
      mentions: mentions,
      mentionsCount: mentions.length
    });

    // SOLUCIÓN: Solo procesar menciones explícitas
    let processedMentions = Array.isArray(mentions) ? [...mentions] : [];

    if (processedMentions.length === 0) {
      console.log('❌ No hay menciones para procesar');
      return res.json({ 
        success: true, 
        notificationsCreated: 0,
        message: 'No se encontraron menciones para procesar' 
      });
    }

    // Obtener información del remitente
    const sender = await User.findByPk(senderId);
    const senderName = sender ? sender.username : 'Usuario';

    // Parsear el contexto si viene como string
    let parsedContext = context;
    if (typeof context === 'string') {
      try {
        parsedContext = JSON.parse(context);
        console.log('📦 Contexto parseado desde string:', parsedContext);
      } catch (error) {
        console.warn('⚠️  No se pudo parsear el contexto:', error);
        parsedContext = {};
      }
    }

    // CREAR CONTEXTO MEJORADO con información específica para mostrar el texto
    const enhancedContext = {
      senderName: parsedContext.senderName || senderName,
      section: parsedContext.section || 'general',
      redirectUrl: parsedContext.redirectUrl || '/',
      metadata: {
        ...parsedContext.metadata,
        // AGREGAR targetElement AUTOMÁTICAMENTE si tenemos productId
        targetElement: parsedContext.metadata?.targetElement || 
                      (parsedContext.metadata?.productId ? `product-${parsedContext.metadata.productId}` : undefined),
        // Asegurar que tenemos productId
        productId: parsedContext.metadata?.productId,
        productName: parsedContext.metadata?.productName,
        productSKU: parsedContext.metadata?.productSKU,
        // INFORMACIÓN ESPECÍFICA PARA MOSTRAR EL TEXTO
        mentionText: text, // Texto completo donde ocurrió la mención
        mentionType: 'note', // Tipo de mención (note, comment, etc.)
        highlightText: text?.substring(0, 100), // Texto a resaltar
        // Información adicional PARA EL MODAL
        timestamp: new Date().toISOString(),
        originalText: text?.substring(0, 500),
        showInModal: true,
        modalTitle: `Mención de ${senderName}`,
        modalContent: text
      }
    };

    console.log('🔄 Contexto mejorado:', enhancedContext);

    // Procesar menciones
    const notifications = await processMentions(
      text || `Mencionado por ${senderName}`, 
      senderId, 
      enhancedContext
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
    console.log('🎯 Creating notification with data:', notificationData);
    
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
    console.log('👤 Recipient found:', recipient ? recipient.username : 'NOT FOUND');
    
    if (!recipient) throw new Error('Usuario destinatario no encontrado');

    // No crear notificación si es para el mismo usuario
    if (recipientId === senderId) {
      console.log('⏩ Skipping - same user');
      return null;
    }

    // ✅ SOLUCIÓN TEMPORAL: Truncar URL si es muy larga
    const truncatedRedirectUrl = redirectUrl && redirectUrl.length > 255 
      ? redirectUrl.substring(0, 255)
      : redirectUrl;

    const notification = await Notification.create({
      recipientId,
      senderId,
      type,
      message,
      redirectUrl: truncatedRedirectUrl, // Usar URL truncada
      metadata
    });

    console.log('✅ Notification created:', notification.id);
    return notification;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    logger.error('Error al crear notificación:', error);
    throw error;
  }
};

const processMentions = async (text, senderId, context = {}) => {
  try {
    console.log('🎯 DEBUG processMentions - INICIO');
    console.log('📝 Texto:', text?.substring(0, 100));
    console.log('👤 Sender ID:', senderId);
    console.log('📋 Contexto completo:', JSON.stringify(context, null, 2));
    console.log('📦 Metadata:', context.metadata);

    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) mentions.push(match[1]);

    console.log('👥 Menciones encontradas:', mentions);

    if (mentions.length === 0) {
      console.log('❌ No hay menciones, saliendo');
      return [];
    }

    // Buscar usuarios mencionados
    const mentionedUsers = await User.findAll({
      where: { username: { [Op.in]: mentions } },
      attributes: ['uuid', 'username']
    });

    console.log('👤 Usuarios encontrados en BD:', mentionedUsers.map(u => u.username));

    const toCreate = mentionedUsers.map((user) => {
      // INCLUIR INFORMACIÓN COMPLETA PARA EL MODAL
      const notificationData = {
        recipientId: user.uuid,
        senderId,
        type: 'mention',
        message: `${context.senderName || 'Alguien'} te mencionó: "${text.length > 100 ? text.substring(0, 100) + '...' : text}"`,
        redirectUrl: buildSpecificRedirectUrl(context),
        metadata: { 
          originalText: text, 
          context: context.section || 'general',
          targetElement: context.metadata?.targetElement,
          scrollTo: context.metadata?.scrollTo,
          highlight: context.metadata?.highlight,
          productId: context.metadata?.productId,
          productName: context.metadata?.productName,
          productSKU: context.metadata?.productSKU,
          mentionType: context.metadata?.mentionType || 'note',
          timestamp: context.metadata?.timestamp || new Date().toISOString(),
          senderName: context.senderName,
          // INFORMACIÓN ESPECÍFICA PARA EL MODAL
          showInModal: true,
          modalTitle: `Mención de ${context.senderName || 'usuario'}`,
          modalContent: text,
          ...(context.metadata || {})
        }
      };
      
      console.log('📨 Notificación a crear:', {
        recipient: user.username,
        metadata: notificationData.metadata
      });
      
      return notificationData;
    });

    const notifications = [];
    for (const data of toCreate) {
      const n = await createNotification(data);
      if (n) notifications.push(n);
    }

    console.log('✅ Notificaciones creadas:', notifications.length);
    return notifications;
  } catch (error) {
    console.error('❌ Error en processMentions:', error);
    logger.error('Error al procesar menciones:', error);
    throw error;
  }
};

const getUserNotifications = async (req, res) => {
  try {
    const userId = currentUserId(req);
    console.log('🔍 User ID:', userId);
    
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
    
    console.log('📋 Fetching notifications for user:', userId);

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

    console.log('📨 Notifications found:', count);
    
    const totalPages = Math.max(Math.ceil(count / limit), 1);

    // Formato que espera tu frontend - ASEGURAR METADATA
    const notifications = rows.map(n => ({
      id: n.id,
      title: n.type === 'mention' ? 'Mención' : 'Notificación',
      message: n.message,
      type: n.type,
      isRead: n.isRead,
      redirectUrl: n.redirectUrl,
      createdAt: n.createdAt,
      sender: n.sender ? {
        uuid: n.sender.uuid,
        username: n.sender.username
      } : null,
      metadata: n.metadata || {} // ✅ ASEGURAR que siempre es un objeto, no null
    }));

    console.log('📝 Notifications with metadata:', notifications.map(n => ({
      id: n.id,
      hasMetadata: !!n.metadata,
      metadata: n.metadata
    })));

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
    console.error('❌ Error detailed:', error);
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
      redirectUrl: notification.redirectUrl // Incluir la URL específica en la respuesta
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