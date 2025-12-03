// models/Reservation.js
const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  terrazaId: { type: String, required: true },
  terrazaNombre: { type: String, required: true },
  clienteId: { type: String, required: true },
  nombreCliente: { type: String, required: true },
  emailCliente: { type: String, required: true },
  phoneCliente: { type: String },
  fechaReserva: { type: Date, required: true },
  horaInicio: { type: String, required: true },
  horaFin: { type: String, required: true },
  tipoEvento: { type: String, default: 'Cumpleaños' },
  comentarios: { type: String },
  esVisita: { type: Boolean, default: false },
  estado: { 
    type: String, 
    enum: ['pendiente', 'confirmada', 'cancelada', 'completada'],
    default: 'pendiente' 
  },
  precioTotal: { type: Number, default: 0 },
  ubicacion: { type: String },
  capacidad: { type: Number },
  propietarioNombre: { type: String },
  duracionVisita: { type: Number },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now } // ✅ Campo nuevo
});

// Middleware para actualizar updatedAt antes de guardar
reservationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Reservation', reservationSchema);