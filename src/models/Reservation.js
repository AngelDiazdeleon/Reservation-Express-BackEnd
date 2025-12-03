const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  // Información del usuario/cliente
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  nombreCliente: {
    type: String,
    required: true
  },
  emailCliente: {
    type: String,
    required: true
  },
  phoneCliente: {
    type: String
  },
  
  // Información de la terraza
  terraza: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PublicationRequest',
    required: true
  },
  terrazaNombre: {
    type: String,
    required: true
  },
  ubicacion: {
    type: String
  },
  capacidad: {
    type: Number
  },
  
  // Información del propietario (host)
  propietarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  propietarioNombre: {
    type: String
  },
  
  // Detalles de la reservación
  tipoEvento: {
    type: String,
    default: 'General'
  },
  tipoReservacion: {
    type: String,
    enum: ['reservation', 'visit'],
    default: 'reservation'
  },
  esVisita: {
    type: Boolean,
    default: false
  },
  
  // Fechas y horarios
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
  duracionVisita: {
    type: Number // en horas
  },
  
  // Detalles de la reserva
  guests: {
    type: Number,
    required: true,
    min: 1
  },
  comentarios: {
    type: String
  },
  specialRequests: {
    type: String
  },
  
  // Estado y precios
  estado: {
    type: String,
    enum: ['pendiente', 'confirmada', 'cancelada', 'completada', 'active'],
    default: 'pendiente'
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'active'],
    default: 'pending'
  },
  precioTotal: {
    type: Number,
    default: 0
  },
  totalPrice: {
    type: Number
  },
  
  // Información de pago
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'failed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'transfer', 'online'],
    default: 'cash'
  },
  paymentId: {
    type: String
  },
  
  // Campos de auditoría
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  cancelledAt: {
    type: Date
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancellationReason: {
    type: String
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true // Esto creará automáticamente createdAt y updatedAt
});

// Índices para mejor performance
reservationSchema.index({ user: 1, fechaReserva: -1 });
reservationSchema.index({ terraza: 1, fechaReserva: 1 });
reservationSchema.index({ propietarioId: 1, estado: 1 });
reservationSchema.index({ estado: 1 });
reservationSchema.index({ fechaReserva: 1 });

// Middleware para actualizar updatedAt
reservationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Sincronizar los dos campos de estado
  if (this.estado && !this.status) {
    const estadoMap = {
      'pendiente': 'pending',
      'confirmada': 'confirmed',
      'cancelada': 'cancelled',
      'completada': 'completed',
      'active': 'active'
    };
    this.status = estadoMap[this.estado] || 'pending';
  } else if (this.status && !this.estado) {
    const statusMap = {
      'pending': 'pendiente',
      'confirmed': 'confirmada',
      'cancelled': 'cancelada',
      'completed': 'completada',
      'active': 'active'
    };
    this.estado = statusMap[this.status] || 'pendiente';
  }
  
  // Sincronizar precios
  if (this.precioTotal && !this.totalPrice) {
    this.totalPrice = this.precioTotal;
  } else if (this.totalPrice && !this.precioTotal) {
    this.precioTotal = this.totalPrice;
  }
  
  next();
});

// Método de instancia para verificar disponibilidad
reservationSchema.methods.checkAvailability = async function() {
  const Reservation = mongoose.model('Reservation');
  
  const overlappingReservations = await Reservation.find({
    terraza: this.terraza,
    fechaReserva: this.fechaReserva,
    estado: { $in: ['confirmada', 'pendiente', 'active'] },
    _id: { $ne: this._id },
    $or: [
      {
        horaInicio: { $lt: this.horaFin },
        horaFin: { $gt: this.horaInicio }
      }
    ]
  });
  
  return overlappingReservations.length === 0;
};

// Método para cancelar reservación
reservationSchema.methods.cancelReservation = function(userId, reason) {
  this.estado = 'cancelada';
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancelledBy = userId;
  this.cancellationReason = reason;
  return this.save();
};

// Método para confirmar reservación
reservationSchema.methods.confirmReservation = function() {
  this.estado = 'confirmada';
  this.status = 'confirmed';
  return this.save();
};

// Método para completar reservación
reservationSchema.methods.completeReservation = function() {
  this.estado = 'completada';
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

// Método estático para obtener reservaciones de un usuario
reservationSchema.statics.findByUser = function(userId) {
  return this.find({ user: userId })
    .populate('terraza', 'terraceData.name terraceData.location terraceData.price')
    .populate('propietarioId', 'name email phone')
    .sort({ fechaReserva: -1 });
};

// Método estático para obtener reservaciones de un host/propietario
reservationSchema.statics.findByHost = function(hostId) {
  return this.find({ propietarioId: hostId })
    .populate('user', 'name email phone')
    .populate('terraza', 'terraceData.name terraceData.location')
    .sort({ fechaReserva: -1 });
};

// Método estático para obtener reservaciones de una terraza
reservationSchema.statics.findByTerraza = function(terrazaId) {
  return this.find({ terraza: terrazaId })
    .populate('user', 'name email phone')
    .sort({ fechaReserva: 1 });
};

module.exports = mongoose.model('Reservation', reservationSchema);