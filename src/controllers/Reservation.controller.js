const Reservation = require('../models/Reservation');
const mongoose = require('mongoose');

// ✅ MÉTODO: Crear reserva
exports.createReservation = async (req, res) => {
  try {
    console.log('🎯 CREANDO RESERVA/VISITA...');
    console.log('📝 Datos recibidos:', req.body);
    console.log('👤 Usuario:', req.user);

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const fechaReserva = req.body.fechaReserva 
      ? new Date(req.body.fechaReserva)
      : new Date();

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
    console.error('🔴 Stack trace:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor: ' + error.message
    });
  }
};

// ✅ MÉTODO: Obtener reservas del usuario
exports.getMyReservations = async (req, res) => {
  try {
    console.log('📋 OBTENIENDO RESERVAS DEL USUARIO...');
    console.log('👤 ID del usuario:', req.user.id);

    const reservations = await Reservation.find({
      clienteId: req.user.id
    }).sort({ createdAt: -1 });

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

// ✅ MÉTODO: Cancelar reserva
exports.cancelReservation = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('❌ CANCELANDO RESERVA...');
    console.log('📋 ID de reserva:', id);
    console.log('👤 Usuario que cancela:', req.user.id);

    const reservation = await Reservation.findById(id);
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }

    if (reservation.clienteId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para cancelar esta reserva'
      });
    }

    if (reservation.estado === 'cancelada') {
      return res.status(400).json({
        success: false,
        message: 'La reserva ya está cancelada'
      });
    }

    if (reservation.estado === 'completada') {
      return res.status(400).json({
        success: false,
        message: 'No puedes cancelar una reserva completada'
      });
    }

    if (reservation.estado === 'confirmada') {
      return res.status(400).json({
        success: false,
        message: 'Reserva confirmada. Contacta al anfitrión para cancelar'
      });
    }

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

// ✅ MÉTODO: Sincronización offline masiva (BULKSYNC) - VERSIÓN SIMPLIFICADA
exports.bulkSyncReservations = async (req, res) => {
  try {
    console.log('🔄 ===== SINCRONIZACIÓN OFFLINE MASIVA =====');
    console.log('👤 Usuario autenticado ID:', req.user.id);
    console.log('📊 Número de reservas recibidas:', req.body.reservations?.length || 0);
    
    const { reservations = [] } = req.body;
    
    if (!Array.isArray(reservations)) {
      return res.status(400).json({
        success: false,
        message: 'reservations debe ser un array'
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const userId = req.user.id;
    const mapping = [];
    let savedCount = 0;

    console.log(`🔄 Procesando ${reservations.length} reservas para el usuario: ${userId}`);

    for (let i = 0; i < reservations.length; i++) {
      const r = reservations[i];
      
      if (!r) continue;
      
      console.log(`🔍 Procesando reserva ${i + 1}: ${r.terrazaNombre || 'Sin nombre'}`);
      
      try {
        // Crear reserva nueva desde datos offline
        const reservationData = {
          clienteId: userId,
          terrazaId: r.terrazaId || 'unknown',
          terrazaNombre: r.terrazaNombre || 'Terraza',
          fechaReserva: r.fechaReserva ? new Date(r.fechaReserva) : new Date(),
          horaInicio: r.horaInicio || '10:00',
          horaFin: r.horaFin || '12:00',
          tipoEvento: r.tipoEvento || '',
          descripcion: r.descripcion || '',
          numPersonas: r.numPersonas || 1,
          esVisita: r.esVisita || false,
          estado: r.estado || 'pendiente',
          precioTotal: r.precioTotal || 0,
          ubicacion: r.ubicacion || '',
          capacidad: r.capacidad || 0,
          propietarioNombre: r.propietarioNombre || '',
          duracionVisita: r.duracionVisita || (r.esVisita ? 1.5 : 5),
          nombreCliente: r.nombreCliente || '',
          emailCliente: r.emailCliente || '',
          phoneCliente: r.phoneCliente || '',
          comentarios: r.descripcion || r.comentarios || '',
          // Metadata para tracking
          syncedFromOffline: true,
          originalClientId: r.clienteId || '',
          createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
          updatedAt: new Date()
        };
        
        const reservation = new Reservation(reservationData);
        await reservation.save();
        
        savedCount++;
        
        if (r.clienteId) {
          mapping.push({
            clienteId: r.clienteId,
            serverId: reservation._id.toString()
          });
        }
        
        console.log(`✅ Reserva guardada con ID: ${reservation._id}`);
        
      } catch (error) {
        console.error(`❌ Error en reserva ${i}:`, error.message);
      }
    }

    console.log(`✅ Sincronización completada: ${savedCount} reservas guardadas`);
    console.log('🔗 Mapeos creados:', mapping);

    return res.status(200).json({
      success: true,
      message: `Sincronización completada. ${savedCount} reservas guardadas`,
      mapping: mapping,
      syncedCount: savedCount,
      savedCount: savedCount,
      receivedCount: reservations.length
    });

  } catch (error) {
    console.error('🔴 ERROR CRÍTICO en bulkSync:', error.message);
    console.error('🔴 Stack trace:', error.stack);
    
    return res.status(500).json({
      success: false,
      message: 'Error en sincronización: ' + error.message
    });
  }
};

// ✅ MÉTODO: Diagnóstico del sistema
exports.diagnostic = async (req, res) => {
  try {
    console.log('🔍 DIAGNÓSTICO DEL SISTEMA DE RESERVAS');
    
    const stats = {
      usuario: {
        id: req.user.id,
        role: req.user.role
      },
      mongoDB: {
        status: mongoose.connection.readyState,
        readyState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
      },
      estadisticas: {
        reservasTotales: await Reservation.countDocuments(),
        reservasUsuario: await Reservation.countDocuments({ clienteId: req.user.id }),
        reservasOffline: await Reservation.countDocuments({ 
          clienteId: req.user.id,
          syncedFromOffline: true 
        })
      }
    };

    return res.status(200).json({
      success: true,
      message: 'Diagnóstico completado',
      data: stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error en diagnóstico:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en diagnóstico: ' + error.message
    });
  }
};

//----------------------------------------------------------------

// ✅ MÉTODO: Obtener reservas para host (sus terrazas)
exports.getHostReservations = async (req, res) => {
  try {
    console.log('🏨 OBTENIENDO RESERVAS PARA HOST...');
    console.log('👤 Host ID:', req.user.id);

    if (!req.user || req.user.role !== 'host') {
      return res.status(403).json({
        success: false,
        message: 'Acceso solo para hosts'
      });
    }

    // Obtener todas las reservas (en producción filtrarías por terrazas del host)
    const reservations = await Reservation.find({})
      .sort({ createdAt: -1 });

    console.log(`✅ Encontradas ${reservations.length} reservas para el host`);

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

// ✅ MÉTODO: Aprobar reserva (host)
exports.approveReservation = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('✅ APROBANDO RESERVA...');
    console.log('📋 ID de reserva:', id);
    console.log('👤 Host que aprueba:', req.user.id);

    if (!req.user || req.user.role !== 'host') {
      return res.status(403).json({
        success: false,
        message: 'Acceso solo para hosts'
      });
    }

    const reservation = await Reservation.findById(id);
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }

    // En producción, aquí verificarías que el host es dueño de la terraza
    // if (reservation.propietarioNombre !== req.user.name) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'No eres el propietario de esta terraza'
    //   });
    // }

    if (reservation.estado === 'confirmada') {
      return res.status(400).json({
        success: false,
        message: 'La reserva ya está aprobada'
      });
    }

    if (reservation.estado === 'cancelada') {
      return res.status(400).json({
        success: false,
        message: 'No puedes aprobar una reserva cancelada'
      });
    }

    reservation.estado = 'confirmada';
    reservation.updatedAt = new Date();
    await reservation.save();

    console.log('✅ Reserva aprobada exitosamente');

    return res.status(200).json({
      success: true,
      message: '✅ Reserva aprobada exitosamente',
      data: {
        id: reservation._id,
        estado: reservation.estado,
        terrazaNombre: reservation.terrazaNombre,
        fecha: reservation.fechaReserva
      }
    });

  } catch (error) {
    console.error('🔴 ERROR:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error al aprobar reserva: ' + error.message
    });
  }
};

// ✅ MÉTODO: Rechazar reserva (host)
exports.rejectReservation = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('❌ RECHAZANDO RESERVA...');
    console.log('📋 ID de reserva:', id);
    console.log('👤 Host que rechaza:', req.user.id);

    if (!req.user || req.user.role !== 'host') {
      return res.status(403).json({
        success: false,
        message: 'Acceso solo para hosts'
      });
    }

    const reservation = await Reservation.findById(id);
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }

    // En producción, aquí verificarías que el host es dueño de la terraza
    // if (reservation.propietarioNombre !== req.user.name) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'No eres el propietario de esta terraza'
    //   });
    // }

    if (reservation.estado === 'cancelada') {
      return res.status(400).json({
        success: false,
        message: 'La reserva ya está rechazada/cancelada'
      });
    }

    if (reservation.estado === 'completada') {
      return res.status(400).json({
        success: false,
        message: 'No puedes rechazar una reserva completada'
      });
    }

    reservation.estado = 'cancelada';
    reservation.updatedAt = new Date();
    await reservation.save();

    console.log('✅ Reserva rechazada exitosamente');

    return res.status(200).json({
      success: true,
      message: '✅ Reserva rechazada exitosamente',
      data: {
        id: reservation._id,
        estado: reservation.estado,
        terrazaNombre: reservation.terrazaNombre,
        fecha: reservation.fechaReserva
      }
    });

  } catch (error) {
    console.error('🔴 ERROR:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error al rechazar reserva: ' + error.message
    });
  }
};