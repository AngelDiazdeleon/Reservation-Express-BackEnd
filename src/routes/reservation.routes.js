// routes/Reservation.routes.js
const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/Reservation.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

// ✅ RUTA PARA CREAR RESERVA/VISITA
router.post('/create', requireAuth, requireRole(['client']), reservationController.createReservation);

// ✅ NUEVA RUTA PARA OBTENER RESERVAS DEL USUARIO
router.get('/my-reservations', requireAuth, requireRole(['client']), reservationController.getMyReservations);

// ✅ RUTA PARA CANCELAR RESERVA
router.put('/:id/cancel', requireAuth, requireRole(['client']), reservationController.cancelReservation);

module.exports = router;