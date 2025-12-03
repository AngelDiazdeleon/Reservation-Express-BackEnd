const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { requireAuth } = require('../middleware/auth');

// ✅ Obtener todas las notificaciones del usuario
router.get('/', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, unread } = req.query;
    const skip = (page - 1) * limit;
    
    const filter = { userId: req.user.id };
    
    if (unread === 'true') {
      filter.read = false;
    }
    
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ 
      userId: req.user.id, 
      read: false 
    });
    
    res.json({
      success: true,
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount,
      totalCount: total
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener notificaciones'
    });
  }
});

// ✅ Marcar notificación como leída
router.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }
    
    await notification.markAsRead();
    
    res.json({
      success: true,
      message: 'Notificación marcada como leída',
      notification
    });
    
  } catch (error) {
    console.error('❌ Error marcando notificación como leída:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar notificación como leída'
    });
  }
});

// ✅ Marcar todas las notificaciones como leídas
router.patch('/mark-all-read', requireAuth, async (req, res) => {
  try {
    const result = await Notification.markAllAsRead(req.user.id);
    
    res.json({
      success: true,
      message: 'Todas las notificaciones marcadas como leídas',
      updatedCount: result.modifiedCount
    });
    
  } catch (error) {
    console.error('❌ Error marcando todas como leídas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar notificaciones como leídas'
    });
  }
});

// ✅ Obtener contador de no leídas
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.user.id);
    
    res.json({
      success: true,
      unreadCount: count
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo contador de no leídas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener contador de notificaciones'
    });
  }
});

// ✅ Eliminar notificación
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }
    
    res.json({
      success: true,
      message: 'Notificación eliminada'
    });
    
  } catch (error) {
    console.error('❌ Error eliminando notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar notificación'
    });
  }
});

// ✅ Eliminar todas las notificaciones leídas
router.delete('/read/clear', requireAuth, async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      userId: req.user.id,
      read: true
    });
    
    res.json({
      success: true,
      message: 'Notificaciones leídas eliminadas',
      deletedCount: result.deletedCount
    });
    
  } catch (error) {
    console.error('❌ Error eliminando notificaciones leídas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar notificaciones'
    });
  }
});

module.exports = router;