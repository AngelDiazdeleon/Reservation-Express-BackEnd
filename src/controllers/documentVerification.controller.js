const DocumentVerification = require('../models/documentVerification');
const localFileService = require('../services/localFile.service');
const fs = require('fs');
const path = require('path');

exports.uploadDocuments = async (req, res) => {
  try {
    console.log('🖼️ Iniciando upload de imágenes...');
    console.log('📋 Imágenes recibidas:', req.files ? req.files.length : 0);
    console.log('🏷️ Categorías:', req.body.categories);
    console.log('👤 Usuario autenticado:', req.user); // ✅ VERIFICAR USUARIO

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se han subido imágenes'
      });
    }

    // ✅ OBTENER USER ID DEL MIDDLEWARE DE AUTENTICACIÓN
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
        usuario: userId // ✅ AGREGAR USUARIO AL LOG
      });

      try {
        // Guardar archivo localmente
        const saveResult = await localFileService.saveFile(
          file.buffer,
          file.originalname
        );

        console.log('✅ Imagen guardada localmente:', saveResult.fileName);

        // Crear documento en la base de datos
        const document = new DocumentVerification({
          userId: userId, // ✅ USAR EL ID DEL USUARIO AUTENTICADO
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

// ✅ CORREGIR: Obtener documentos del usuario autenticado
exports.getUserDocuments = async (req, res) => {
  try {
    // ✅ OBTENER USER ID DEL MIDDLEWARE DE AUTENTICACIÓN
    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    console.log('📋 Obteniendo imágenes del usuario autenticado:', userId);

    // ✅ FILTRAR SOLO POR EL USUARIO AUTENTICADO
    const documents = await DocumentVerification.find({ userId: userId })
      .sort({ uploadDate: -1 });

    console.log(`✅ Encontrados ${documents.length} documentos para usuario ${userId}`);

    res.status(200).json({
      success: true,
      documents: documents,
      total: documents.length
    });

  } catch (error) {
    console.error('❌ Error en getUserDocuments:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener imágenes'
    });
  }
};

// Los demás métodos permanecen igual pero agregar verificación de propiedad
exports.downloadDocument = async (req, res) => {
  try {
    const documentId = req.params.id;
    const userId = req.user.id; // ✅ OBTENER USUARIO AUTENTICADO

    console.log('📥 Solicitando imagen:', documentId, 'para usuario:', userId);

    const document = await DocumentVerification.findById(documentId);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Imagen no encontrada'
      });
    }

    // ✅ VERIFICAR QUE EL DOCUMENTO PERTENEZCA AL USUARIO
    if (document.userId !== userId) {
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

exports.deleteDocument = async (req, res) => {
  try {
    const documentId = req.params.id;
    const userId = req.user.id; // ✅ OBTENER USUARIO AUTENTICADO

    console.log('🗑️ Eliminando imagen:', documentId, 'para usuario:', userId);

    const document = await DocumentVerification.findById(documentId);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Imagen no encontrada'
      });
    }

    // ✅ VERIFICAR QUE EL DOCUMENTO PERTENEZCA AL USUARIO
    if (document.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar este documento'
      });
    }

    // Eliminar archivo local
    await localFileService.deleteFile(document.filePath);

    // Eliminar de la base de datos
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

exports.getDocumentById = async (req, res) => {
  try {
    const documentId = req.params.id;
    const userId = req.user.id; // ✅ OBTENER USUARIO AUTENTICADO

    console.log('🔍 Buscando imagen:', documentId, 'para usuario:', userId);

    const document = await DocumentVerification.findById(documentId);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Imagen no encontrada'
      });
    }

    // ✅ VERIFICAR QUE EL DOCUMENTO PERTENEZCA AL USUARIO
    if (document.userId !== userId) {
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

exports.updateDocumentStatus = async (req, res) => {
  try {
    const documentId = req.params.id;
    const { status, adminNotes } = req.body;
    const userId = req.user.id; // ✅ OBTENER USUARIO AUTENTICADO

    console.log('🔄 Actualizando estado del documento:', documentId, 'por usuario:', userId);

    const document = await DocumentVerification.findById(documentId);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    // ✅ VERIFICAR QUE EL DOCUMENTO PERTENEZCA AL USUARIO (o permitir a admin)
    if (document.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para actualizar este documento'
      });
    }

    const updatedDocument = await DocumentVerification.findByIdAndUpdate(
      documentId,
      { 
        status: status,
        reviewDate: new Date(),
        reviewedBy: userId,
        adminNotes: adminNotes
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Estado actualizado correctamente',
      document: updatedDocument
    });

  } catch (error) {
    console.error('❌ Error en updateDocumentStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el estado del documento'
    });
  }
};