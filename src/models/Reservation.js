const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  // ID del usuario que hace la reserva (ID REAL del usuario)
  clienteId: {
    type: String,
    required: true,
    index: true
  },
  
  // Información de la terraza
  terrazaId: {
    type: String,
    required: true
  },
  terrazaNombre: {
    type: String,
    required: true
  },
  
  // Fecha y hora de la reserva
  fechaReserva: {
    type: Date,
    required: true
  },
  horaInicio: {
    type: String,
    required: true
  },
  horaFin: {
    type: String,
    required: true
  },
  
  // Detalles del evento
  tipoEvento: {
    type: String,
    default: ''
  },
  descripcion: {
    type: String,
    default: ''
  },
  numPersonas: {
    type: Number,
    default: 1
  },
  
  // Tipo de reserva
  esVisita: {
    type: Boolean,
    default: false
  },
  
  // Estado de la reserva
  estado: {
    type: String,
    enum: ['pendiente', 'confirmada', 'cancelada', 'completada'],
    default: 'pendiente'
  },
  
  // Información de pago (para reservas)
  precioTotal: {
    type: Number,
    default: 0
  },
  
  // Información adicional
  ubicacion: {
    type: String,
    default: ''
  },
  capacidad: {
    type: Number,
    default: 0
  },
  propietarioNombre: {
    type: String,
    default: ''
  },
  duracionVisita: {
    type: Number,
    default: 0
  },
  
  // Información del cliente (backup)
  nombreCliente: {
    type: String,
    default: ''
  },
  emailCliente: {
    type: String,
    default: ''
  },
  phoneCliente: {
    type: String,
    default: ''
  },
  comentarios: {
    type: String,
    default: ''
  },
  
  // Metadata para sincronización offline
  metadata: {
    syncedFromOffline: {
      type: Boolean,
      default: false
    },
    originalClienteId: {
      type: String,
      default: ''
    },
    offlineCreatedAt: {
      type: Date
    },
    lastSyncAt: {
      type: Date
    },
    // Para debugging
    syncLogs: [{
      timestamp: Date,
      action: String,
      details: String
    }]
  }
}, {
  timestamps: true, // Esto crea automáticamente createdAt y updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Método para agregar log de sincronización
reservationSchema.methods.addSyncLog = function(action, details) {
  if (!this.metadata) this.metadata = {};
  if (!this.metadata.syncLogs) this.metadata.syncLogs = [];
  
  this.metadata.syncLogs.push({
    timestamp: new Date(),
    action: action,
    details: details
  });
  
  return this;
};

// Virtual para saber si fue creada offline
reservationSchema.virtual('isOfflineReservation').get(function() {
  return this.metadata?.syncedFromOffline === true;
});

// Virtual para obtener el ID original offline
reservationSchema.virtual('originalOfflineId').get(function() {
  return this.metadata?.originalClienteId || null;
});

// Índices para mejorar el rendimiento
reservationSchema.index({ clienteId: 1 });
reservationSchema.index({ fechaReserva: 1 });
reservationSchema.index({ estado: 1 });
reservationSchema.index({ esVisita: 1 });
reservationSchema.index({ 'metadata.syncedFromOffline': 1 });
reservationSchema.index({ 'metadata.originalClienteId': 1 });
reservationSchema.index({ createdAt: -1 });

const Reservation = mongoose.model('Reservation', reservationSchema);

module.exports = Reservation;