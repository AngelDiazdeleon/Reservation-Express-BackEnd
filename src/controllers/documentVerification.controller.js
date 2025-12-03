const DocumentVerification = require('../models/documentVerification');
const User = require('../models/User'); // ← IMPORTACIÓN AGREGADA
const localFileService = require('../services/localFile.service');
const fs = require('fs');
const path = require('path');

// FUNCIÓN 1: Para ADMIN - Obtener documentos de cualquier usuario
exports.getUserDocumentsForAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`📋 [ADMIN] Obteniendo documentos del usuario: ${userId}`);
    
    // Buscar documentos del usuario específico
    const documents = await DocumentVerification.find({ 
      userId: userId 
    }).sort({ uploadDate: -1 });
    
    console.log(`✅ [ADMIN] Encontrados ${documents.length} documentos`);
    
    res.json({
      success: true,
      documents: documents.map(doc => ({
        _id: doc._id,
        fileName: doc.fileName,
        filePath: doc.filePath,
        fileSize: doc.fileSize,
        fileType: doc.fileType,
        mimeType: doc.mimeType,
        category: doc.category,
        description: doc.description,
        status: doc.status,
        uploadDate: doc.uploadDate,
        reviewDate: doc.reviewDate,
        reviewedBy: doc.reviewedBy,
        adminNotes: doc.adminNotes,
        userId: doc.userId,
        downloadUrl: `/api/document-verification/download/${doc._id}`
      })),
      count: documents.length
    });
  } catch (error) {
    console.error('❌ [ADMIN] Error obteniendo documentos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener documentos',
      error: error.message
    });
  }
};

// FUNCIÓN 2: Para usuarios normales - Obtener sus propios documentos
exports.getMyDocuments = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    console.log('📋 [USER] Obteniendo imágenes del usuario autenticado:', userId);

    const documents = await DocumentVerification.find({ userId: userId })
      .sort({ uploadDate: -1 });

    console.log(`✅ [USER] Encontrados ${documents.length} documentos para usuario ${userId}`);

    res.status(200).json({
      success: true,
      documents: documents,
      total: documents.length
    });

  } catch (error) {
    console.error('❌ [USER] Error en getMyDocuments:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener imágenes'
    });
  }
};

// FUNCIÓN 3: Actualizar estado de documento (PARA ADMIN)
exports.updateDocumentStatus = async (req, res) => {
  try {
    const documentId = req.params.id;
    const { status, adminNotes } = req.body;
    const adminId = req.user.id;
    
    console.log(`🔄 [ADMIN] Cambiando estado del documento ${documentId} a ${status}`);

    // Validar estados permitidos
    const validStatuses = ['pending', 'approved', 'rejected', 'under_review'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido. Use: pending, approved, rejected, under_review'
      });
    }

    // Buscar el documento
    const document = await DocumentVerification.findById(documentId);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    console.log('📋 Documento encontrado:', {
      documentId: document._id,
      userId: document.userId,
      currentStatus: document.status
    });

    // Actualizar el documento
    const updatedDocument = await DocumentVerification.findByIdAndUpdate(
      documentId,
      { 
        status: status,
        adminNotes: adminNotes || '',
        reviewDate: new Date(),
        reviewedBy: adminId
      },
      { new: true }
    );

    console.log('✅ Documento actualizado:', {
      newStatus: updatedDocument.status,
      reviewedBy: updatedDocument.reviewedBy
    });

    // Obtener información del usuario dueño del documento
    const user = await User.findById(document.userId).select('name email');

    res.status(200).json({
      success: true,
      message: `Documento ${status} exitosamente`,
      document: {
        _id: updatedDocument._id,
        fileName: updatedDocument.fileName,
        filePath: updatedDocument.filePath,
        fileSize: updatedDocument.fileSize,
        fileType: updatedDocument.fileType,
        mimeType: updatedDocument.mimeType,
        category: updatedDocument.category,
        description: updatedDocument.description,
        status: updatedDocument.status,
        uploadDate: updatedDocument.uploadDate,
        reviewDate: updatedDocument.reviewDate,
        reviewedBy: updatedDocument.reviewedBy,
        adminNotes: updatedDocument.adminNotes,
        userId: updatedDocument.userId,
        downloadUrl: `/api/document-verification/download/${updatedDocument._id}`
      },
      user: user || null
    });

  } catch (error) {
    console.error('❌ [ADMIN] Error en updateDocumentStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el estado del documento',
      error: error.message
    });
  }
};

// FUNCIÓN 4: Upload documentos
exports.uploadDocuments = async (req, res) => {
  try {
    console.log('🖼️ Iniciando upload de imágenes...');
    console.log('📋 Imágenes recibidas:', req.files ? req.files.length : 0);
    console.log('🏷️ Categorías:', req.body.categories);
    console.log('👤 Usuario autenticado:', req.user);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se han subido imágenes'
      });
    }

    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const categories = Array.isArray(req.body.categories) ? req.body.categories : [req.body.categories];

    console.log('💾 Guardando imágenes para usuario:', userId);

    const documentPromises = req.files.map(async (file, index) => {
      const category = categories && categories[index] ? categories[index] : 'general';
      
      console.log(`🖼️ Procesando imagen ${index + 1}:`, {
        nombre: file.originalname,
        tipo: file.mimetype,
        tamaño: file.size,
        categoría: category,
        usuario: userId
      });

      try {
        const saveResult = await localFileService.saveFile(
          file.buffer,
          file.originalname
        );

        console.log('✅ Imagen guardada localmente:', saveResult.fileName);

        const document = new DocumentVerification({
          userId: userId,
          fileName: saveResult.originalName,
          filePath: saveResult.fileName,
          fileSize: file.size,
          fileType: path.extname(file.originalname),
          category: category,
          description: `Imagen de verificación - ${category}`,
          uploadDate: new Date(),
          status: 'pending',
          mimeType: file.mimetype
        });

        const savedDoc = await document.save();
        console.log('✅ Documento guardado en MongoDB para usuario:', userId);
        
        return savedDoc;
        
      } catch (uploadError) {
        console.error('❌ Error al guardar imagen:', uploadError.message);
        throw new Error(`Error al procesar imagen ${file.originalname}: ${uploadError.message}`);
      }
    });

    const savedDocuments = await Promise.all(documentPromises);

    console.log('🎉 Upload completado. Imágenes guardadas para usuario:', userId);

    res.status(200).json({
      success: true,
      message: `✅ ${savedDocuments.length} imágenes guardadas exitosamente`,
      documents: savedDocuments,
      requestId: `req_${Date.now()}_${userId}`,
      totalDocuments: savedDocuments.length
    });

  } catch (error) {
    console.error('❌ Error en uploadDocuments:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al procesar las imágenes'
    });
  }
};

// FUNCIÓN 5: Descargar documento
exports.downloadDocument = async (req, res) => {
  try {
    const documentId = req.params.id;
    const userId = req.user.id;

    console.log('📥 Solicitando imagen:', documentId, 'para usuario:', userId);

    const document = await DocumentVerification.findById(documentId);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Imagen no encontrada'
      });
    }

    // ✅ PERMITIR SI ES ADMIN O EL DUEÑO DEL DOCUMENTO
    if (document.userId.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a este documento'
      });
    }

    console.log('🖼️ Sirviendo imagen:', document.fileName);

    const fileStream = localFileService.getFile(document.filePath);
    
    if (!fileStream) {
      return res.status(404).json({
        success: false,
        message: 'Archivo de imagen no encontrado'
      });
    }

    res.set({
      'Content-Type': document.mimeType,
      'Content-Disposition': `inline; filename="${document.fileName}"`,
      'Content-Length': document.fileSize
    });

    fileStream.pipe(res);

  } catch (error) {
    console.error('❌ Error en downloadDocument:', error);
    res.status(500).json({
      success: false,
      message: 'Error al descargar la imagen'
    });
  }
};

// FUNCIÓN 6: Eliminar documento
exports.deleteDocument = async (req, res) => {
  try {
    const documentId = req.params.id;
    const userId = req.user.id;

    console.log('🗑️ Eliminando imagen:', documentId, 'para usuario:', userId);

    const document = await DocumentVerification.findById(documentId);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Imagen no encontrada'
      });
    }

    if (document.userId.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar este documento'
      });
    }

    await localFileService.deleteFile(document.filePath);
    await DocumentVerification.findByIdAndDelete(documentId);

    console.log('✅ Imagen eliminada:', documentId);

    res.status(200).json({
      success: true,
      message: 'Imagen eliminada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error en deleteDocument:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la imagen'
    });
  }
};

// FUNCIÓN 7: Obtener documento por ID
exports.getDocumentById = async (req, res) => {
  try {
    const documentId = req.params.id;
    const userId = req.user.id;

    console.log('🔍 Buscando imagen:', documentId, 'para usuario:', userId);

    const document = await DocumentVerification.findById(documentId);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Imagen no encontrada'
      });
    }

    if (document.userId.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver este documento'
      });
    }

    res.status(200).json({
      success: true,
      document: document
    });

  } catch (error) {
    console.error('❌ Error en getDocumentById:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la imagen'
    });
  }
};