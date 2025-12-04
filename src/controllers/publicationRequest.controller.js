const mongoose = require('mongoose');
const PublicationRequest = require('../models/PublicationRequest');
const DocumentVerification = require('../models/documentVerification'); // ✅ AGREGAR ESTA IMPORTACIÓN
const localFileService = require('../services/localFile.service');
const RealTimeService = require('../services/realTime.service');
const fs = require('fs');
const path = require('path');

class PublicationRequestController {
  constructor() {
    this.create = this.create.bind(this);
    this.list = this.list.bind(this);
    this.getById = this.getById.bind(this);
    this.approve = this.approve.bind(this);
    this.reject = this.reject.bind(this);
    this.getMyRequests = this.getMyRequests.bind(this);
    this.getApprovedTerrazas = this.getApprovedTerrazas.bind(this);
    this.getTerrazaById = this.getTerrazaById.bind(this);
    this.getPendingForAdmin = this.getPendingForAdmin.bind(this); // ✅ NUEVO MÉTODO
    this.getUserDocuments = this.getUserDocuments.bind(this); // ✅ NUEVO MÉTODO
  }

  // ✅ MÉTODO NUEVO: Obtener terrazas pendientes para administrador
  // En tu PublicationRequestController.js
async getPendingForAdmin(req, res) {
  try {
    console.log('📋 [ADMIN BACKEND] ===== INICIANDO getPendingForAdmin =====');
    console.log('👤 Usuario solicitante:', {
      id: req.user.id,
      role: req.user.role,
      email: req.user.email
    });

    // Verificar que sea admin
    if (req.user.role !== 'admin') {
      console.log('❌ [ADMIN BACKEND] Acceso denegado: Usuario no es admin');
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Se requieren permisos de administrador.'
      });
    }

    // Obtener TODAS las solicitudes primero, sin filtro
    console.log('🔍 [ADMIN BACKEND] Buscando TODAS las solicitudes...');
    const allRequests = await PublicationRequest.find({})
      .populate('owner', 'name email phone')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });

    console.log(`📊 [ADMIN BACKEND] Total de solicitudes en DB: ${allRequests.length}`);
    
    // Log todas las solicitudes encontradas
    allRequests.forEach((req, index) => {
      console.log(`   ${index + 1}. ID: ${req._id}, Nombre: ${req.terraceData?.name || 'Sin nombre'}, Estado: ${req.status}, Owner: ${req.owner?.name || 'Sin owner'}`);
    });

    // Filtrar solo pendientes o rechazadas
    const pendingRequests = allRequests.filter(request => 
      request.status === 'pending' || request.status === 'rejected'
    );

    console.log(`✅ [ADMIN BACKEND] Solicitudes pendientes/rechazadas: ${pendingRequests.length}`);
    
    // Para cada solicitud, obtener los documentos del propietario
    console.log('📄 [ADMIN BACKEND] Obteniendo documentos de propietarios...');
    const requestsWithDocuments = await Promise.all(
      pendingRequests.map(async (request) => {
        const documents = await DocumentVerification.find({
          userId: request.owner._id.toString()
        }).sort({ uploadDate: -1 });

        console.log(`   📄 Para ${request.owner.name}: ${documents.length} documentos`);

        return {
          _id: request._id,
          terraceData: {
            name: request.terraceData?.name || 'Sin nombre',
            description: request.terraceData?.description || 'Sin descripción',
            location: request.terraceData?.location || 'Sin ubicación',
            capacity: request.terraceData?.capacity || 0,
            price: request.terraceData?.price || 0,
            contactPhone: request.terraceData?.contactPhone || '',
            contactEmail: request.terraceData?.contactEmail || '',
            amenities: request.terraceData?.amenities || [],
            rules: request.terraceData?.rules || ''
          },
          owner: {
            _id: request.owner._id,
            name: request.owner.name,
            email: request.owner.email,
            phone: request.owner.phone
          },
          photos: request.photos || [],
          status: request.status,
          adminNotes: request.adminNotes,
          reviewedBy: request.reviewedBy,
          reviewedAt: request.reviewedAt,
          createdAt: request.createdAt,
          updatedAt: request.updatedAt,
          documents: documents.map(doc => ({
            _id: doc._id,
            fileName: doc.fileName,
            category: doc.category,
            status: doc.status,
            uploadDate: doc.uploadDate,
            adminNotes: doc.adminNotes,
            reviewDate: doc.reviewDate,
            mimeType: doc.mimeType,
            fileSize: doc.fileSize,
            filePath: doc.filePath || '',
            downloadUrl: `/api/document-verification/download/${doc._id}`
          }))
        };
      })
    );

    const responseData = {
      success: true,
      terraces: requestsWithDocuments,
      count: requestsWithDocuments.length,
      stats: {
        pending: pendingRequests.filter(r => r.status === 'pending').length,
        rejected: pendingRequests.filter(r => r.status === 'rejected').length,
        total: pendingRequests.length,
        allTotal: allRequests.length
      },
      debug: {
        timestamp: new Date().toISOString(),
        userId: req.user.id,
        allRequestsCount: allRequests.length,
        filteredCount: pendingRequests.length
      }
    };

    console.log('📨 [ADMIN BACKEND] Enviando respuesta:', {
      success: responseData.success,
      terracesCount: responseData.count,
      stats: responseData.stats
    });

    res.json(responseData);

  } catch (error) {
    console.error('❌ [ADMIN BACKEND] Error obteniendo terrazas pendientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno al obtener terrazas pendientes',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
  // Eliminaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaar
  // ✅ MÉTODO PARA ELIMINAR PUBLICACIÓN (HOST)
async delete(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    console.log(`🗑️ [HOST] Eliminando publicación ${id} por usuario ${userId}`);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID inválido' 
      });
    }
    
    // Buscar la publicación
    const publication = await PublicationRequest.findById(id);
    
    if (!publication) {
      return res.status(404).json({ 
        success: false, 
        message: 'Publicación no encontrada' 
      });
    }
    
    // Verificar que el usuario sea el dueño
    if (publication.owner.toString() !== userId && req.user.role !== 'admin') {
      console.log('❌ Usuario no autorizado para eliminar esta publicación');
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes permisos para eliminar esta publicación' 
      });
    }
    
    // Verificar si hay reservas activas (si aplica)
    // Puedes agregar esta lógica si tienes un modelo de reservas
    // const Reservation = require('../models/Reservation');
    // const activeReservations = await Reservation.countDocuments({
    //   terraceId: id,
    //   status: { $in: ['pending', 'confirmed', 'active'] }
    // });
    
    // if (activeReservations > 0 && publication.status === 'approved') {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'No puedes eliminar una terraza con reservas activas'
    //   });
    // }
    
    // Eliminar las fotos asociadas si existen
    if (publication.photos && publication.photos.length > 0) {
      console.log(`🗑️ Eliminando ${publication.photos.length} fotos...`);
      
      for (const photo of publication.photos) {
        try {
          // Eliminar archivo físico si existe
          if (photo.filename) {
            await localFileService.deleteFile(photo.filename);
            console.log(`✅ Foto eliminada: ${photo.filename}`);
          }
        } catch (fileError) {
          console.warn(`⚠️ Error eliminando foto: ${fileError.message}`);
          // Continuar aunque falle la eliminación del archivo
        }
      }
    }
    
    // Eliminar el documento de la base de datos
    await PublicationRequest.findByIdAndDelete(id);
    
    console.log(`✅ Publicación ${id} eliminada exitosamente`);
    
    // Notificar al host sobre la eliminación
    await RealTimeService.notifyHostTerraceDeleted(
      userId,
      {
        id: publication._id,
        name: publication.terraceData?.name || 'Terraza'
      }
    );
    
    // Si era una terraza aprobada, notificar a administradores
    if (publication.status === 'approved') {
      const User = require('../models/User');
      const user = await User.findById(userId);
      
      await RealTimeService.notifyAdminsTerraceDeleted(
        {
          id: publication._id,
          name: publication.terraceData?.name || 'Terraza',
          hostName: user?.name || 'Anfitrión',
          deletedAt: new Date()
        }
      );
    }
    
    res.json({ 
      success: true, 
      message: 'Terraza eliminada exitosamente',
      data: {
        id: publication._id,
        name: publication.terraceData?.name
      }
    });
    
  } catch (err) {
    console.error('💥 Error eliminando publicación:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error eliminando la terraza', 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}
  // --------------------------------------------------
  // ✅ MÉTODO NUEVO: Obtener documentos de un usuario específico
  async getUserDocuments(req, res) {
    try {
      const { userId } = req.params;

      // Verificar que sea admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado'
        });
      }

      console.log(`📋 [ADMIN] Obteniendo documentos del usuario: ${userId}`);

      const documents = await DocumentVerification.find({ userId })
        .sort({ uploadDate: -1 });

      res.json({
        success: true,
        documents: documents.map(doc => ({
          _id: doc._id,
          fileName: doc.fileName,
          category: doc.category,
          status: doc.status,
          uploadDate: doc.uploadDate,
          adminNotes: doc.adminNotes,
          reviewDate: doc.reviewDate,
          mimeType: doc.mimeType,
          fileSize: doc.fileSize,
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
  }

  // ✅ MÉTODO PARA CREAR PUBLICACIÓN (EXISTENTE - MODIFICADO)
  async create(req, res) {
    console.log('🚀 CREANDO PUBLICACIÓN...');
    
    try {
      // Verificar autenticación
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const ownerId = req.user.id;
      const ownerRole = req.user.role;
      
      console.log('👤 Usuario:', ownerId, 'Rol:', ownerRole);
      console.log('📦 Campos recibidos:', Object.keys(req.body));

      // Si el usuario no es host, verificar que tenga documentos aprobados
      if (ownerRole === 'user') {
        console.log('🔍 Verificando documentos del usuario...');
        const userDocuments = await DocumentVerification.find({
          userId: ownerId,
          status: 'approved'
        });

        const requiredDocs = ['identificacion', 'permisos_terrazas', 'comprobante_domicilio'];
        const missingDocs = requiredDocs.filter(docType => 
          !userDocuments.some(doc => doc.category === docType && doc.status === 'approved')
        );

        if (missingDocs.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Documentos pendientes de aprobación',
            details: `Faltan documentos aprobados: ${missingDocs.join(', ')}`,
            requiredDocuments: requiredDocs,
            approvedDocuments: userDocuments.map(doc => doc.category)
          });
        }

        console.log('✅ Todos los documentos están aprobados');
      }

      // Obtener datos del usuario para notificaciones
      const User = require('../models/User');
      const user = await User.findById(ownerId);

      // Validar campos requeridos
      const requiredFields = ['name', 'description', 'capacity', 'location', 'price', 'contactPhone', 'contactEmail'];
      const missingFields = requiredFields.filter(field => !req.body[field]);
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Faltan campos requeridos: ${missingFields.join(', ')}`
        });
      }

      // Procesar fotos
      const files = req.files || {};
      const photosFiles = files.photos || [];
      let uploadedPhotos = [];

      console.log(`🖼️ Procesando ${photosFiles.length} fotos...`);

      if (photosFiles.length > 0) {
        for (let i = 0; i < photosFiles.length; i++) {
          const file = photosFiles[i];
          console.log(`📸 Subiendo foto ${i + 1}: ${file.originalname}`);
          
          try {
            const fileBuffer = fs.readFileSync(file.path);
            const savedFile = await localFileService.saveFile(fileBuffer, file.originalname);
            
            uploadedPhotos.push({
              fileId: new mongoose.Types.ObjectId(),
              filename: savedFile.fileName,
              filePath: savedFile.filePath,
              originalName: savedFile.originalName,
              mimetype: file.mimetype,
              fileType: 'image',
              size: file.size
            });
            
            console.log(`✅ Foto ${i + 1} guardada:`, savedFile.fileName);

            // Limpiar archivo temporal
            fs.unlinkSync(file.path);
            
          } catch (fileError) {
            console.error(`❌ Error subiendo foto ${i + 1}:`, fileError.message);
            // Continuar con las demás fotos
          }
        }
      }

      // Procesar amenities
      let amenities = [];
      try {
        if (req.body.amenities && typeof req.body.amenities === 'string') {
          amenities = JSON.parse(req.body.amenities);
        } else if (Array.isArray(req.body.amenities)) {
          amenities = req.body.amenities;
        }
      } catch (parseError) {
        console.warn('⚠️ Error parseando amenities:', parseError.message);
        amenities = [];
      }

      // Preparar datos de la terraza
      const terraceData = {
        name: req.body.name.trim(),
        description: req.body.description.trim(),
        capacity: parseInt(req.body.capacity) || 1,
        location: req.body.location.trim(),
        price: parseFloat(req.body.price) || 0,
        contactPhone: req.body.contactPhone.trim(),
        contactEmail: req.body.contactEmail.trim().toLowerCase(),
        amenities: amenities,
        rules: (req.body.rules || '').trim()
      };

      // Validaciones adicionales
      if (terraceData.capacity <= 0) {
        return res.status(400).json({
          success: false,
          message: 'La capacidad debe ser mayor a 0'
        });
      }

      if (terraceData.price <= 0) {
        return res.status(400).json({
          success: false,
          message: 'El precio debe ser mayor a 0'
        });
      }

      if (terraceData.description.length < 10) {
        return res.status(400).json({
          success: false,
          message: 'La descripción debe tener al menos 10 caracteres'
        });
      }

      console.log('📊 Datos listos para guardar:', {
        name: terraceData.name,
        capacity: terraceData.capacity,
        price: terraceData.price,
        photos: uploadedPhotos.length
      });

      // Crear y guardar publicación
      const publicationRequest = new PublicationRequest({
        owner: new mongoose.Types.ObjectId(ownerId),
        terraceData: terraceData,
        photos: uploadedPhotos,
        status: 'pending',
        createdAt: new Date()
      });

      console.log('💾 Guardando publicación en MongoDB...');
      const savedRequest = await publicationRequest.save();
      
      // Notificación a administradores - Nueva solicitud de terraza
      await RealTimeService.notifyAdminsNewTerraceRequest(
        {
          id: savedRequest._id,
          name: terraceData.name,
          location: terraceData.location,
          price: terraceData.price,
          capacity: terraceData.capacity,
          ownerName: user.name
        },
        user
      );
      
      // Popular datos para la respuesta
      await savedRequest.populate('owner', 'name email phone');

      console.log('🎉 Publicación guardada exitosamente:', savedRequest._id);

      res.status(201).json({ 
        success: true, 
        message: 'Terraza publicada exitosamente y enviada para revisión',
        notification: {
          type: 'pending_review',
          message: 'Tu terraza ha sido enviada para revisión por los administradores'
        },
        data: {
          id: savedRequest._id,
          terraceData: savedRequest.terraceData,
          photos: savedRequest.photos,
          status: savedRequest.status,
          createdAt: savedRequest.createdAt,
          owner: savedRequest.owner,
          reviewLink: `/admin/publications/${savedRequest._id}`
        }
      });

    } catch (err) {
      console.error('💥 ERROR guardando publicación:', err);
      
      if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
          success: false,
          message: 'Error de validación de datos',
          errors: errors
        });
      }

      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }

  // ✅ MÉTODO PARA LISTAR SOLICITUDES (ADMIN)
  async list(req, res) {
    try {
      const status = req.query.status;
      const filter = status ? { status } : {};
      
      console.log('📋 [ADMIN] Listando publicaciones, filtro:', filter);

      const list = await PublicationRequest.find(filter)
        .populate('owner', 'name email phone')
        .populate('reviewedBy', 'name email')
        .sort({ createdAt: -1 });
      
      // Para cada publicación, agregar información de documentos
      const listWithDocs = await Promise.all(
        list.map(async (publication) => {
          const documents = await DocumentVerification.find({
            userId: publication.owner._id.toString()
          });

          return {
            ...publication.toObject(),
            documents: documents.map(doc => ({
              _id: doc._id,
              category: doc.category,
              status: doc.status,
              fileName: doc.fileName,
              uploadDate: doc.uploadDate
            }))
          };
        })
      );

      res.json({ 
        success: true, 
        data: listWithDocs,
        count: listWithDocs.length
      });
    } catch (err) {
      console.error('❌ Error obteniendo lista:', err);
      res.status(500).json({ 
        success: false, 
        message: 'Error obteniendo lista', 
        error: err.message 
      });
    }
  }

  // ✅ MÉTODO PARA OBTENER POR ID (ADMIN)
  async getById(req, res) {
    try {
      const { id } = req.params;
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }
      
      const request = await PublicationRequest.findById(id)
        .populate('owner', 'name email phone')
        .populate('reviewedBy', 'name email');
        
      if (!request) {
        return res.status(404).json({ 
          success: false, 
          message: 'Solicitud no encontrada' 
        });
      }

      // Obtener documentos del propietario
      const documents = await DocumentVerification.find({
        userId: request.owner._id.toString()
      }).sort({ uploadDate: -1 });

      const responseData = {
        ...request.toObject(),
        documents: documents.map(doc => ({
          _id: doc._id,
          fileName: doc.fileName,
          category: doc.category,
          status: doc.status,
          uploadDate: doc.uploadDate,
          adminNotes: doc.adminNotes,
          downloadUrl: `/api/document-verification/download/${doc._id}`
        }))
      };
      
      res.json({ 
        success: true, 
        data: responseData 
      });
    } catch (err) {
      console.error('❌ Error obteniendo solicitud:', err);
      res.status(500).json({ 
        success: false, 
        message: 'Error obteniendo solicitud', 
        error: err.message 
      });
    }
  }

  // ✅ MÉTODO PARA APROBAR (ADMIN)
  async approve(req, res) {
    try {
      const { id } = req.params;
      const { adminNotes } = req.body;
      
      console.log(`✅ [ADMIN] Aprobando publicación ${id}`);

      const request = await PublicationRequest.findById(id).populate('owner');
      if (!request) {
        return res.status(404).json({ 
          success: false, 
          message: 'Solicitud no encontrada' 
        });
      }
      
      if (request.status !== 'pending') {
        return res.status(400).json({ 
          success: false, 
          message: 'Solicitud no está pendiente' 
        });
      }

      // Actualizar estado
      request.status = 'approved';
      request.adminNotes = adminNotes || '';
      request.reviewedBy = req.user.id;
      request.reviewedAt = new Date();
      
      await request.save();
      await request.populate('reviewedBy', 'name email');

      // Notificación al host
      await RealTimeService.notifyHostTerraceStatus(
        request.owner._id,
        { 
          id: request._id, 
          name: request.terraceData.name,
          location: request.terraceData.location,
          price: request.terraceData.price
        },
        'approved',
        req.user.name || 'Administrador',
        adminNotes
      );

      // Notificación a clientes
      await RealTimeService.notifyClientsNewTerracePublished({
        id: request._id,
        name: request.terraceData.name,
        location: request.terraceData.location,
        price: request.terraceData.price,
        capacity: request.terraceData.capacity,
        amenities: request.terraceData.amenities || [],
        hostName: request.owner.name,
        description: request.terraceData.description,
        imageUrl: this.getImageUrl(request.photos[0])
      });

      // Obtener documentos actualizados para la respuesta
      const documents = await DocumentVerification.find({
        userId: request.owner._id.toString()
      });

      res.json({ 
        success: true, 
        message: 'Solicitud aprobada exitosamente',
        notification: {
          type: 'approved',
          message: `La terraza "${request.terraceData.name}" ha sido aprobada`
        },
        data: {
          ...request.toObject(),
          documents: documents.map(doc => ({
            _id: doc._id,
            category: doc.category,
            status: doc.status
          }))
        }
      });
    } catch (err) {
      console.error('❌ Error aprobando solicitud:', err);
      res.status(500).json({ 
        success: false, 
        message: 'Error aprobando solicitud', 
        error: err.message 
      });
    }
  }

  // ✅ MÉTODO PARA RECHAZAR (ADMIN)
  async reject(req, res) {
    try {
      const { id } = req.params;
      const { adminNotes } = req.body;
      
      console.log(`❌ [ADMIN] Rechazando publicación ${id}`);

      const request = await PublicationRequest.findById(id).populate('owner');
      if (!request) {
        return res.status(404).json({ 
          success: false, 
          message: 'Solicitud no encontrada' 
        });
      }
      
      if (request.status !== 'pending') {
        return res.status(400).json({ 
          success: false, 
          message: 'Solicitud no está pendiente' 
        });
      }

      // Actualizar estado
      request.status = 'rejected';
      request.adminNotes = adminNotes || '';
      request.reviewedBy = req.user.id;
      request.reviewedAt = new Date();
      await request.save();
      
      await request.populate('reviewedBy', 'name email');

      // Notificación al host
      await RealTimeService.notifyHostTerraceStatus(
        request.owner._id,
        { 
          id: request._id, 
          name: request.terraceData.name 
        },
        'rejected',
        req.user.name || 'Administrador',
        adminNotes
      );

      res.json({ 
        success: true, 
        message: 'Solicitud rechazada exitosamente',
        notification: {
          type: 'rejected',
          message: 'El host ha sido notificado del rechazo'
        },
        data: request 
      });
    } catch (err) {
      console.error('❌ Error rechazando solicitud:', err);
      res.status(500).json({ 
        success: false, 
        message: 'Error rechazando solicitud', 
        error: err.message 
      });
    }
  }

  // ✅ MÉTODO PARA OBTENER MIS SOLICITUDES (OWNER)
  async getMyRequests(req, res) {
    try {
      const ownerId = req.user.id;
      console.log(`📋 Obteniendo solicitudes del usuario: ${ownerId}`);

      const requests = await PublicationRequest.find({ owner: ownerId })
        .sort({ createdAt: -1 })
        .populate('owner', 'name email phone')
        .populate('reviewedBy', 'name email');
      
      res.json({ 
        success: true, 
        data: requests,
        count: requests.length
      });
    } catch (err) {
      console.error('❌ Error obteniendo solicitudes:', err);
      res.status(500).json({ 
        success: false, 
        message: 'Error obteniendo solicitudes', 
        error: err.message 
      });
    }
  }

  // ✅ MÉTODO PARA OBTENER TERRENOS APROBADOS (PÚBLICO)
  async getApprovedTerrazas(req, res) {
    try {
      console.log('🏠 Cargando terrazas aprobadas para home...');
      
      const approvedTerrazas = await PublicationRequest.find({ 
        status: 'approved' 
      })
      .populate('owner', 'name email phone')
      .sort({ createdAt: -1 });

      console.log(`✅ Encontradas ${approvedTerrazas.length} terrazas aprobadas`);

      const terrazasFormateadas = approvedTerrazas.map(terraza => ({
        id: terraza._id,
        nombre: terraza.terraceData?.name || 'Terraza sin nombre',
        ubicacion: terraza.terraceData?.location || 'Ubicación no especificada',
        precio: terraza.terraceData?.price || 0,
        calificacion: 4.5,
        capacidad: terraza.terraceData?.capacity || 0,
        imagen: this.getImageUrl(terraza.photos[0]),
        imagenes: terraza.photos.map(photo => this.getImageUrl(photo)),
        categoria: this.getCategoria(terraza),
        descripcion: terraza.terraceData?.description || 'Descripción no disponible',
        amenities: terraza.terraceData?.amenities || [],
        contacto: {
          telefono: terraza.terraceData?.contactPhone,
          email: terraza.terraceData?.contactEmail
        },
        propietario: terraza.owner?.name || 'Anfitrión',
        propietarioInfo: {
          nombre: terraza.owner?.name,
          email: terraza.owner?.email,
          telefono: terraza.owner?.phone
        }
      }));

      res.json({
        success: true,
        data: terrazasFormateadas,
        count: terrazasFormateadas.length,
        message: `${terrazasFormateadas.length} terrazas encontradas`
      });

    } catch (error) {
      console.error('💥 Error cargando terrazas aprobadas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al cargar las terrazas',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ✅ MÉTODO PARA OBTENER TERRENO POR ID (PÚBLICO)
  async getTerrazaById(req, res) {
    try {
      const { id } = req.params;
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID de terraza inválido' 
        });
      }
      
      const terraza = await PublicationRequest.findOne({ 
        _id: id, 
        status: 'approved' 
      }).populate('owner', 'name email phone');
      
      if (!terraza) {
        return res.status(404).json({ 
          success: false, 
          message: 'Terraza no encontrada o no está aprobada' 
        });
      }

      const terrazaFormateada = {
        id: terraza._id,
        nombre: terraza.terraceData?.name,
        ubicacion: terraza.terraceData?.location,
        precio: terraza.terraceData?.price,
        calificacion: 4.5,
        capacidad: terraza.terraceData?.capacity,
        imagenes: terraza.photos.map(photo => this.getImageUrl(photo)),
        categoria: this.getCategoria(terraza),
        descripcion: terraza.terraceData?.description,
        amenities: terraza.terraceData?.amenities || [],
        reglas: terraza.terraceData?.rules,
        contacto: {
          telefono: terraza.terraceData?.contactPhone,
          email: terraza.terraceData?.contactEmail
        },
        propietario: {
          nombre: terraza.owner?.name,
          email: terraza.owner?.email,
          telefono: terraza.owner?.phone,
          verificado: true // Puedes agregar lógica de verificación
        },
        fechaCreacion: terraza.createdAt,
        ultimaActualizacion: terraza.updatedAt
      };

      res.json({ 
        success: true, 
        data: terrazaFormateada 
      });
      
    } catch (error) {
      console.error('💥 Error obteniendo terraza:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al obtener la terraza',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ✅ MÉTODO AUXILIAR: Obtener URL de imagen
  getImageUrl(photo) {
    if (!photo || !photo.filename) {
      return "https://images.unsplash.com/photo-1549294413-26f195200c16?w=400&auto=format&fit=crop&q=80";
    }
    
    if (photo.filename.startsWith('http')) {
      return photo.filename;
    }
    
    const baseUrl = process.env.BASE_URL || 'http://localhost:4000';
    
    // Verificar si es una imagen de terraza
    if (photo.filename.includes('terrace_') || photo.filePath.includes('terrace-images')) {
      return `${baseUrl}/api/terrace-images/${photo.filename}`;
    }
    
    // Imagen por defecto
    return `${baseUrl}/uploads/images/${photo.filename}`;
  }

  // ✅ MÉTODO AUXILIAR: Determinar categoría
  getCategoria(terraza) {
    const price = terraza.terraceData?.price || 0;
    const amenities = terraza.terraceData?.amenities || [];
    const descripcion = (terraza.terraceData?.description || '').toLowerCase();
    
    if (price > 8000) return 'lujo';
    if (amenities.includes('vista panorámica') || amenities.includes('rooftop') || descripcion.includes('vista')) return 'moderno';
    if (amenities.includes('jardín') || amenities.includes('natural') || descripcion.includes('jardín')) return 'bohemio';
    if (price < 4000) return 'economico';
    if (descripcion.includes('rústico') || descripcion.includes('campo')) return 'rustico';
    return 'popular';
  }
}


// ------------------------------------------------------------
module.exports = PublicationRequestController;