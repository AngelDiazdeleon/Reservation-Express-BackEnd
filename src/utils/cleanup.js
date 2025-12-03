// utils/cleanup.js
const cron = require('node-cron');
const PublicationRequest = require('../models/PublicationRequest');
const DocumentVerification = require('../models/documentVerification');

const cleanupRejectedTerraces = async () => {
  try {
    console.log('🔄 Iniciando limpieza automática de terrazas rechazadas...');
    
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    // Buscar terrazas rechazadas mayores a 3 días
    const oldRejectedTerraces = await PublicationRequest.find({
      status: 'rejected',
      updatedAt: { $lt: threeDaysAgo }
    });
    
    if (oldRejectedTerraces.length > 0) {
      console.log(`🗑️ Encontradas ${oldRejectedTerraces.length} terrazas rechazadas para eliminar`);
      
      // Obtener IDs de terrazas
      const terraceIds = oldRejectedTerraces.map(t => t._id);
      const ownerIds = oldRejectedTerraces.map(t => t.owner.toString());
      
      // Eliminar terrazas
      const deleteResult = await PublicationRequest.deleteMany({
        _id: { $in: terraceIds }
      });
      
      console.log(`✅ Eliminadas ${deleteResult.deletedCount} terrazas rechazadas`);
      
      // Opcional: marcar documentos como obsoletos
      await DocumentVerification.updateMany(
        { userId: { $in: ownerIds } },
        { $set: { status: 'archived', adminNotes: 'Documento archivado por eliminación de terraza rechazada' } }
      );
      
      console.log(`📄 Documentos asociados marcados como archivados`);
    } else {
      console.log('✅ No hay terrazas rechazadas antiguas para eliminar');
    }
  } catch (error) {
    console.error('❌ Error en limpieza automática:', error);
  }
};

// Ejecutar todos los días a las 2 AM
if (process.env.NODE_ENV !== 'test') {
  cron.schedule('0 2 * * *', cleanupRejectedTerraces);
  
  // También ejecutar al iniciar el servidor
  console.log('⏰ Programada limpieza automática diaria de terrazas rechazadas (2:00 AM)');
  
  // Ejecutar inmediatamente para desarrollo
  if (process.env.NODE_ENV === 'development') {
    setTimeout(() => {
      cleanupRejectedTerraces();
    }, 5000);
  }
}

module.exports = { cleanupRejectedTerraces };