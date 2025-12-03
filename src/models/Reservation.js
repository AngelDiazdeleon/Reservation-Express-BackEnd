// models/Reservation.js
const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  terraza: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PublicationRequest',
    required: true
  },
  type: {
    type: String,
    enum: ['reservation', 'visit'],
    default: 'reservation'
  },
  date: {
    type: Date,
    required: true
  },
  startTime: String,
  endTime: String,
  guests: {
    type: Number,
    required: true,
    min: 1
  },
  totalPrice: Number,
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'active'],
    default: 'pending'
  },
  specialRequests: String,
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('Reservation', reservationSchema);