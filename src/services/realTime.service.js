// src/services/realTime.service.js
const { notifyAdmins, notifyUser, notifyAllClients } = require('../app');

class RealTimeService {
  // 1. NOTIFICACIÓN A ADMINS: Host subió terraza
  static async notifyAdminsNewTerraceRequest(request, host) {
    try {
      const message = `📋 Nueva solicitud de terraza: "${request.name}"`;
      
      console.log(`🔔 Enviando notificación a admins: ${message}`);
      
      notifyAdmins('new_terrace_request', {
        id: request.id,
        type: 'admin_notification',
        message: message,
        details: {
          requestId: request.id,
          terraceName: request.name,
          hostId: host?._id,
          hostName: host?.name || 'Usuario',
          hostEmail: host?.email || '',
          location: request.location,
          price: request.price,
          capacity: request.capacity,
          submittedAt: new Date().toISOString(),
          status: 'pending',
          priority: 'high',
          action: 'review_needed'
        },
        timestamp: new Date().toISOString(),
        priority: 'high'
      });
      
      console.log('✅ Notificación enviada a admins');
    } catch (error) {
      console.error('❌ Error enviando notificación a admins:', error);
    }
  }

  // 2. NOTIFICACIÓN AL HOST: Aprobación/Rechazo
  static async notifyHostTerraceStatus(hostId, request, status, adminName, notes = '') {
    try {
      const statusText = status === 'approved' ? 'aprobada' : 'rechazada';
      const message = status === 'approved' 
        ? `🎉 ¡Tu terraza "${request.name}" ha sido aprobada!` 
        : `❌ Tu terraza "${request.name}" ha sido rechazada`;
      
      console.log(`🔔 Enviando notificación al host ${hostId}: ${message}`);
      
      notifyUser(hostId, 'terrace_status_update', {
        id: request.id,
        type: 'host_notification',
        message: message,
        details: {
          requestId: request.id,
          terraceName: request.name,
          status: status,
          statusText: statusText,
          adminName: adminName,
          notes: notes,
          updatedAt: new Date().toISOString(),
          action: status === 'approved' ? 'view_terrace' : 'edit_and_resubmit'
        },
        timestamp: new Date().toISOString(),
        priority: 'medium'
      });
      
      console.log(`✅ Notificación enviada al host`);
    } catch (error) {
      console.error(`❌ Error enviando notificación al host:`, error);
    }
  }

  // 3. NOTIFICACIÓN A CLIENTES: Nueva terraza publicada
  static async notifyClientsNewTerracePublished(terrace) {
    try {
      const message = `🏠 ¡Nueva terraza disponible: "${terrace.name}"!`;
      
      console.log(`🔔 Enviando notificación a clientes: ${message}`);
      
      notifyAllClients('new_terrace_published', {
        id: terrace.id,
        type: 'client_notification',
        message: message,
        details: {
          terraceId: terrace.id,
          terraceName: terrace.name,
          location: terrace.location,
          price: terrace.price,
          capacity: terrace.capacity,
          amenities: terrace.amenities || [],
          hostName: terrace.hostName || 'Anfitrión',
          publishedAt: new Date().toISOString(),
          action: 'view_and_book'
        },
        timestamp: new Date().toISOString(),
        priority: 'low'
      });
      
      console.log(`✅ Notificación enviada a clientes`);
    } catch (error) {
      console.error('❌ Error enviando notificación a clientes:', error);
    }
  }
}

module.exports = RealTimeService;