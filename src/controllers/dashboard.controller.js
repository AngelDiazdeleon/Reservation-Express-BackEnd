const User = require('../models/User');
const PublicationRequest = require('../models/PublicationRequest');

exports.getDashboardStats = async (req, res) => {
  try {
    console.log('🚀 SOLICITANDO DATOS REALES DEL DASHBOARD...');
    
    // 1. USUARIOS
    const totalUsuarios = await User.countDocuments();
    
    // 2. TERRENAS
    const totalTerrazas = await PublicationRequest.countDocuments();
    
    // 3. PENDIENTES
    const solicitudesPendientes = await PublicationRequest.countDocuments({ 
      status: 'pending' 
    });
    
    // 4. DETALLES USUARIOS
    const usuariosDetalle = {
      total: totalUsuarios,
      admins: await User.countDocuments({ role: 'admin' }),
      hosts: await User.countDocuments({ role: 'host' }),
      clients: await User.countDocuments({ role: 'client' })
    };
    
    // 5. DETALLES TERRENAS
    const terrazasDetalle = {
      total: totalTerrazas,
      activas: await PublicationRequest.countDocuments({ status: 'active' }) || 0,
      aprobadas: await PublicationRequest.countDocuments({ status: 'approved' }) || 0,
      pendientes: solicitudesPendientes,
      rechazadas: await PublicationRequest.countDocuments({ status: 'rejected' }) || 0,
      inactivas: await PublicationRequest.countDocuments({ status: 'inactive' }) || 0
    };
    
    // 6. USUARIOS ESTE MES
    const fechaActual = new Date();
    const inicioMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
    const usuariosMesActual = await User.countDocuments({ 
      createdAt: { $gte: inicioMes } 
    });
    
    // 7. GRÁFICO 7 DÍAS
    const graficoUsuarios = [];
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      
      const inicioDia = new Date(fecha.setHours(0, 0, 0, 0));
      const finDia = new Date(fecha.setHours(23, 59, 59, 999));
      
      const usuariosDia = await User.countDocuments({
        createdAt: { $gte: inicioDia, $lte: finDia }
      });
      
      graficoUsuarios.push({
        dia: diasSemana[fecha.getDay()],
        usuarios: usuariosDia
      });
    }
    
    // 8. RESERVAS
    let reservasActivas = 0;
    let reservasDetalle = {
      total: 0,
      reservas: 0,
      visitas: 0,
      confirmadas: 0,
      activas: 0,
      pendientes: 0,
      canceladas: 0,
      completadas: 0
    };
    
    try {
      const Reservation = require('../models/Reservation');
      reservasActivas = await Reservation.countDocuments({
        status: { $in: ['confirmed', 'active', 'pending'] }
      });
      
      reservasDetalle = {
        total: await Reservation.countDocuments() || 0,
        reservas: await Reservation.countDocuments({ type: 'reservation' }) || 0,
        visitas: await Reservation.countDocuments({ type: 'visit' }) || 0,
        confirmadas: await Reservation.countDocuments({ status: 'confirmed' }) || 0,
        activas: await Reservation.countDocuments({ status: 'active' }) || 0,
        pendientes: await Reservation.countDocuments({ status: 'pending' }) || 0,
        canceladas: await Reservation.countDocuments({ status: 'cancelled' }) || 0,
        completadas: await Reservation.countDocuments({ status: 'completed' }) || 0
      };
    } catch (error) {
      console.log('ℹ️ Sin reservas');
    }
    
    // 9. COMISIONES
    let comisionesMes = 0;
    let comisionesDetalle = {
      totalMes: 0,
      pagadas: 0,
      pendientes: 0,
      retrasadas: 0
    };
    
    try {
      const Commission = require('../models/commission');
      const comisionesData = await Commission.aggregate([
        {
          $match: {
            createdAt: { $gte: inicioMes }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);
      
      comisionesMes = comisionesData.length > 0 ? comisionesData[0].total : 0;
      
      comisionesDetalle = {
        totalMes: comisionesMes,
        pagadas: await Commission.countDocuments({ status: 'collected', createdAt: { $gte: inicioMes } }),
        pendientes: await Commission.countDocuments({ status: 'pending', createdAt: { $gte: inicioMes } }),
        retrasadas: await Commission.countDocuments({ status: 'refunded', createdAt: { $gte: inicioMes } })
      };
    } catch (error) {
      console.log('ℹ️ Sin comisiones');
    }
    
    // 10. DOCUMENTOS
    let documentosPendientes = 0;
    try {
      const DocumentVerification = require('../models/documentVerification');
      documentosPendientes = await DocumentVerification.countDocuments({
        status: 'pending'
      });
    } catch (error) {
      console.log('ℹ️ Sin documentos');
    }
    
    // 11. CRECIMIENTO
    const mesAnteriorInicio = new Date(fechaActual.getFullYear(), fechaActual.getMonth() - 1, 1);
    const mesAnteriorFin = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 0);
    
    const usuariosMesAnterior = await User.countDocuments({
      createdAt: { $gte: mesAnteriorInicio, $lte: mesAnteriorFin }
    });
    
    let crecimientoUsuarios = 0;
    if (usuariosMesAnterior > 0) {
      crecimientoUsuarios = Math.round(((usuariosMesActual - usuariosMesAnterior) / usuariosMesAnterior) * 100);
    } else if (usuariosMesActual > 0) {
      crecimientoUsuarios = 100;
    }
    
    console.log('✅ DATOS ENVIADOS AL FRONTEND');
    
    // RESPUESTA
    res.json({
      success: true,
      totalTerrazas,
      totalUsuarios,
      reservasActivas,
      comisionesMes,
      documentosPendientes,
      solicitudesPendientes,
      usuariosMesActual,
      crecimientoUsuarios,
      
      terrazasDetalle,
      usuariosDetalle,
      reservasDetalle,
      comisionesDetalle,
      
      graficoUsuarios,
      
      timestamp: new Date().toISOString(),
      message: 'Datos obtenidos de MongoDB'
    });

  } catch (error) {
    console.error('💥 ERROR:', error);
    
    res.json({
      success: true,
      totalTerrazas: 0,
      totalUsuarios: 0,
      reservasActivas: 0,
      comisionesMes: 0,
      documentosPendientes: 0,
      solicitudesPendientes: 0,
      usuariosMesActual: 0,
      crecimientoUsuarios: 0,
      
      terrazasDetalle: {
        total: 0,
        activas: 0,
        aprobadas: 0,
        pendientes: 0,
        rechazadas: 0,
        inactivas: 0
      },
      
      usuariosDetalle: {
        total: 0,
        admins: 0,
        hosts: 0,
        clients: 0
      },
      
      graficoUsuarios: [
        { dia: 'Lun', usuarios: 0 },
        { dia: 'Mar', usuarios: 0 },
        { dia: 'Mié', usuarios: 0 },
        { dia: 'Jue', usuarios: 0 },
        { dia: 'Vie', usuarios: 0 },
        { dia: 'Sáb', usuarios: 0 },
        { dia: 'Dom', usuarios: 0 }
      ]
    });
  }
};