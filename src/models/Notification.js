const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'reservation',        // Nueva reserva
      'verification',       // Documento verificado
      'payment',            // Pago procesado
      'terrace_approved',   // Terraza aprobada
      'terrace_rejected',   // Terraza rechazada
      'message',           // Mensaje nuevo
      'review',            // Nueva reseña
      'system'             // Notificación del sistema
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed, // Datos adicionales
    default: {}
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  expiresAt: {
    type: Date // Para notificaciones temporales
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices compuestos para mejor performance
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL para expirar notificaciones

// Método para marcar como leída
notificationSchema.methods.markAsRead = function() {
  this.read = true;
  this.updatedAt = new Date();
  return this.save();
};

// Método estático para crear notificaciones de sistema
notificationSchema.statics.createSystemNotification = async function(userId, title, message, data = {}) {
  return this.create({
    userId,
    type: 'system',
    title,
    message,
    data,
    priority: 'medium'
  });
};

// Método estático para crear notificación de reserva
notificationSchema.statics.createReservationNotification = async function(userId, reservationData) {
  return this.create({
    userId,
    type: 'reservation',
    title: 'Nueva Reserva',
    message: `Tienes una nueva reserva para ${reservationData.terrazaNombre}`,
    data: reservationData,
    priority: 'high'
  });
};

// Método estático para crear notificación de verificación
notificationSchema.statics.createVerificationNotification = async function(userId, documentData) {
  const statusMessage = {
    'approved': 'aprobado',
    'rejected': 'rechazado',
    'pending': 'pendiente'
  };

  return this.create({
    userId,
    type: 'verification',
    title: 'Estado de Documentos',
    message: `Tu documento "${documentData.fileName}" ha sido ${statusMessage[documentData.status] || documentData.status}`,
    data: documentData,
    priority: documentData.status === 'rejected' ? 'high' : 'medium'
  });
};

// Método estático para obtener notificaciones no leídas
notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({ userId, read: false });
};

// Método estático para marcar todas como leídas
notificationSchema.statics.markAllAsRead = async function(userId) {
  return this.updateMany(
    { userId, read: false },
    { read: true, updatedAt: new Date() }
  );
};

module.exports = mongoose.model('Notification', notificationSchema);