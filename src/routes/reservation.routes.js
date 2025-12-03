const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/Reservation.controller');
const { requireAuth, requireRole } = require('../middleware/auth'); // <-- Asegúrate de que la ruta sea correcta

// ✅ RUTA PARA CREAR RESERVA/VISITA
router.post('/create', requireAuth, requireRole(['client']), reservationController.createReservation);

// ✅ RUTA PARA OBTENER RESERVAS DEL USUARIO
router.get('/my-reservations', requireAuth, requireRole(['client']), reservationController.getMyReservations);

// ✅ RUTA PARA CANCELAR RESERVA
router.put('/:id/cancel', requireAuth, requireRole(['client']), reservationController.cancelReservation);

// ✅ RUTA PARA SINCRONIZACIÓN OFFLINE MASIVA (BULKSYNC)
router.post('/bulksync', requireAuth, requireRole(['client']), reservationController.bulkSyncReservations);

// ✅ RUTA PARA DIAGNÓSTICO DEL SISTEMA
router.get('/diagnostic', requireAuth, requireRole(['client']), reservationController.diagnostic);

// --------------------------------------------------------------------------

// En reservation.routes.js
router.get('/host/reservations', requireAuth, requireRole(['host']), reservationController.getHostReservations);
router.put('/:id/approve', requireAuth, requireRole(['host']), reservationController.approveReservation);
router.put('/:id/reject', requireAuth, requireRole(['host']), reservationController.rejectReservation);

module.exports = router;