// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const path = require('path');

const controllerPath = path.join(__dirname, '..', 'controllers', 'notificationController.js');

const {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  getAvailableUsers,
  createNotificationFromClient,
  processMentionsFromForm,
  getNotificationStats
} = require(controllerPath);

const { requireAuth } = require('../middleware/authMiddleware');

// Todas estas rutas vivirán bajo /api/notifications
router.use(requireAuth);

// LISTAR: GET /api/notifications?page=1&limit=10
router.get('/', getUserNotifications);

// CONTADOR: GET /api/notifications/unread-count
router.get('/unread-count', getUnreadCount);

// USUARIOS para @menciones: GET /api/notifications/available-users
router.get('/available-users', getAvailableUsers);

// MARCAR UNA como leída: PATCH /api/notifications/:notificationId/read
router.patch('/:notificationId/read', markAsRead);

// MARCAR TODAS como leídas: PATCH /api/notifications/mark-all-read
router.patch('/mark-all-read', markAllAsRead);

// ELIMINAR: DELETE /api/notifications/:notificationId
router.delete('/:notificationId', deleteNotification);

// CREAR desde cliente (opcional): POST /api/notifications
router.post('/', createNotificationFromClient);

// PROCESAR menciones desde formulario: POST /api/notifications/process-mentions
router.post('/process-mentions', processMentionsFromForm);

// STATS (opcional): GET /api/notifications/stats
router.get('/stats', getNotificationStats);

router.post('/process-mentions', async (req, res) => {
    try {
        const { text, mentions, context } = req.body;
        const senderId = req.user.id; // O de session

        const notifications = await processMentions(text, senderId, context);
        
        res.json({
            success: true,
            notificationsCreated: notifications.length,
            message: `Menciones procesadas correctamente`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error al procesar menciones'
        });
    }
});
module.exports = router;
