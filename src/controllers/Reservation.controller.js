// controllers/Reservation.controller.js
const Reservation = require('../models/Reservation');

exports.createReservation = async (req, res) => {
  try {
    console.log('🎯 CREANDO RESERVA/VISITA...');
    console.log('📝 Datos recibidos:', req.body);
    console.log('👤 Usuario:', req.user);

    // Validar que el usuario esté autenticado
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    // Convertir fechaReserva a objeto Date si viene como string
    const fechaReserva = req.body.fechaReserva 
      ? new Date(req.body.fechaReserva)
      : new Date();

    // Crear la reserva
    const reservationData = {
      ...req.body,
      clienteId: req.user.id,
      fechaReserva: fechaReserva,
      estado: 'pendiente',
      createdAt: new Date()
    };

    console.log('💾 Guardando en MongoDB...');

    const reservation = new Reservation(reservationData);
    await reservation.save();

    console.log('✅ ¡Reserva guardada exitosamente en MongoDB!');
    console.log('📊 ID de reserva:', reservation._id);

    return res.status(201).json({
      success: true,
      message: reservationData.esVisita 
        ? '✅ Solicitud de visita creada exitosamente' 
        : '✅ Reserva creada exitosamente',
      data: {
        id: reservation._id,
        terrazaNombre: reservation.terrazaNombre,
        fecha: reservation.fechaReserva,
        horaInicio: reservation.horaInicio,
        horaFin: reservation.horaFin,
        estado: reservation.estado,
        esVisita: reservation.esVisita
      }
    });

  } catch (error) {
    console.error('🔴 ERROR:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor: ' + error.message
    });
  }
};

// ✅ NUEVO MÉTODO: Obtener reservas del usuario
exports.getMyReservations = async (req, res) => {
  try {
    console.log('📋 OBTENIENDO RESERVAS DEL USUARIO...');
    console.log('👤 ID del usuario:', req.user.id);

    // Obtener todas las reservas del usuario
    const reservations = await Reservation.find({
      clienteId: req.user.id
    }).sort({ createdAt: -1 }); // Ordenar por fecha de creación descendente

    console.log(`✅ Encontradas ${reservations.length} reservas`);

    return res.status(200).json({
      success: true,
      message: 'Reservas obtenidas exitosamente',
      data: reservations
    });

  } catch (error) {
    console.error('🔴 ERROR:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener reservas: ' + error.message
    });
  }
};

// ✅ NUEVO MÉTODO: Cancelar reserva
exports.cancelReservation = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('❌ CANCELANDO RESERVA...');
    console.log('📋 ID de reserva:', id);
    console.log('👤 Usuario que cancela:', req.user.id);

    // Buscar la reserva
    const reservation = await Reservation.findById(id);
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }

    // Verificar que la reserva pertenezca al usuario
    if (reservation.clienteId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para cancelar esta reserva'
      });
    }

    // Verificar que no esté ya cancelada
    if (reservation.estado === 'cancelada') {
      return res.status(400).json({
        success: false,
        message: 'La reserva ya está cancelada'
      });
    }

    // Verificar que no esté completada
    if (reservation.estado === 'completada') {
      return res.status(400).json({
        success: false,
        message: 'No puedes cancelar una reserva completada'
      });
    }

    // Verificar que no esté confirmada (solo el host puede cancelar confirmadas)
    if (reservation.estado === 'confirmada') {
      return res.status(400).json({
        success: false,
        message: 'Reserva confirmada. Contacta al anfitrión para cancelar'
      });
    }

    // Actualizar estado a cancelada
    reservation.estado = 'cancelada';
    reservation.updatedAt = new Date();
    await reservation.save();

    console.log('✅ Reserva cancelada exitosamente');

    return res.status(200).json({
      success: true,
      message: reservation.esVisita 
        ? '✅ Cita cancelada exitosamente' 
        : '✅ Reserva cancelada exitosamente',
      data: {
        id: reservation._id,
        estado: reservation.estado
      }
    });

  } catch (error) {
    console.error('🔴 ERROR:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error al cancelar reserva: ' + error.message
    });
  }
};

