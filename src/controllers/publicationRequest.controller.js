// controllers/publicationRequest.controller.js
const mongoose = require('mongoose');
const PublicationRequest = require('../models/PublicationRequest');
const localFileService = require('../services/localFile.service');
const fs = require('fs');

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
  }

  async create(req, res) {
    console.log('🚀 CREANDO PUBLICACIÓN CON LOCALFILESERVICE...');
    
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const ownerId = req.user.id;
      
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

      console.log(`🖼️ Procesando ${photosFiles.length} fotos con LocalFileService...`);

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
          }
        }
      }

      // Procesar amenities
      let amenities = [];
      try {
        if (req.body.amenities && typeof req.body.amenities === 'string') {
          amenities = JSON.parse(req.body.amenities);
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

      // Validaciones
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

      console.log('📊 Datos listos para guardar en MongoDB:', {
        name: terraceData.name,
        capacity: terraceData.capacity,
        price: terraceData.price,
        photos: uploadedPhotos.length
      });

      // Crear publicación
      const publicationRequest = new PublicationRequest({
        owner: new mongoose.Types.ObjectId(ownerId),
        terraceData: terraceData,
        photos: uploadedPhotos,
        status: 'pending',
        createdAt: new Date()
      });

      console.log('💾 Guardando publicación en MongoDB...');
      const savedRequest = await publicationRequest.save();
      
      await savedRequest.populate('owner', 'name email phone');

      console.log('🎉 Publicación guardada exitosamente en MongoDB:', savedRequest._id);

      res.status(201).json({ 
        success: true, 
        message: 'Terraza publicada exitosamente y enviada para revisión',
        data: {
          id: savedRequest._id,
          terraceData: savedRequest.terraceData,
          photos: savedRequest.photos,
          status: savedRequest.status,
          createdAt: savedRequest.createdAt,
          owner: savedRequest.owner
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

  async getMyRequests(req, res) {
    try {
      const ownerId = req.user.id;
      const requests = await PublicationRequest.find({ owner: ownerId })
        .sort({ createdAt: -1 })
        .populate('owner', 'name email phone')
        .populate('reviewedBy', 'name email');
      
      res.json({ 
        success: true, 
        data: requests
      });
    } catch (err) {
      res.status(500).json({ 
        success: false, 
        message: 'Error obteniendo solicitudes', 
        error: err.message 
      });
    }
  }

  async list(req, res) {
    try {
      const status = req.query.status;
      const filter = status ? { status } : {};
      
      const list = await PublicationRequest.find(filter)
        .populate('owner', 'email name phone')
        .populate('reviewedBy', 'name email')
        .sort({ createdAt: -1 });
      
      res.json({ 
        success: true, 
        data: list
      });
    } catch (err) {
      res.status(500).json({ 
        success: false, 
        message: 'Error obteniendo lista', 
        error: err.message 
      });
    }
  }

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
        .populate('owner', 'email name phone')
        .populate('reviewedBy', 'name email');
        
      if (!request) {
        return res.status(404).json({ 
          success: false, 
          message: 'Solicitud no encontrada' 
        });
      }
      
      res.json({ success: true, data: request });
    } catch (err) {
      res.status(500).json({ 
        success: false, 
        message: 'Error obteniendo solicitud', 
        error: err.message 
      });
    }
  }

  async approve(req, res) {
    try {
      const { id } = req.params;
      const { adminNotes } = req.body;
      
      const request = await PublicationRequest.findById(id);
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

      request.status = 'approved';
      request.adminNotes = adminNotes || '';
      request.reviewedBy = req.user.id;
      request.reviewedAt = new Date();
      
      await request.save();
      await request.populate('reviewedBy', 'name email');

      res.json({ 
        success: true, 
        message: 'Solicitud aprobada',
        data: request 
      });
    } catch (err) {
      res.status(500).json({ 
        success: false, 
        message: 'Error aprobando solicitud', 
        error: err.message 
      });
    }
  }

  async reject(req, res) {
    try {
      const { id } = req.params;
      const { adminNotes } = req.body;
      
      const request = await PublicationRequest.findById(id);
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

      request.status = 'rejected';
      request.adminNotes = adminNotes || '';
      request.reviewedBy = req.user.id;
      request.reviewedAt = new Date();
      await request.save();
      
      await request.populate('reviewedBy', 'name email');

      res.json({ 
        success: true, 
        message: 'Solicitud rechazada',
        data: request 
      });
    } catch (err) {
      res.status(500).json({ 
        success: false, 
        message: 'Error rechazando solicitud', 
        error: err.message 
      });
    }
  }

  // ✅ Obtener todas las terrazas aprobadas
  async getApprovedTerrazas(req, res) {
    try {
      console.log('🏠 Cargando terrazas aprobadas para home...');
      
      const approvedTerrazas = await PublicationRequest.find({ 
        status: 'approved' 
      })
      .populate('owner', 'name email phone')
      .sort({ createdAt: -1 });

      console.log(`✅ Encontradas ${approvedTerrazas.length} terrazas aprobadas`);

      // Transformar datos para el frontend
      const terrazasFormateadas = approvedTerrazas.map(terraza => ({
        id: terraza._id,
        nombre: terraza.terraceData?.name || 'Terraza sin nombre',
        ubicacion: terraza.terraceData?.location || 'Ubicación no especificada',
        precio: terraza.terraceData?.price || 0,
        calificacion: 4.5,
        capacidad: terraza.terraceData?.capacity || 0,
        imagen: this.getTerrazaImage(terraza),
        categoria: this.getCategoria(terraza),
        descripcion: terraza.terraceData?.description || 'Descripción no disponible',
        amenities: terraza.terraceData?.amenities || [],
        contacto: {
          telefono: terraza.terraceData?.contactPhone,
          email: terraza.terraceData?.contactEmail
        },
        propietario: terraza.owner?.name || 'Anfitrión'
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

  // ✅ Obtener terraza específica por ID
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

      // Formatear respuesta
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
          telefono: terraza.owner?.phone
        },
        fechaCreacion: terraza.createdAt
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

  // ✅ MÉTODO CORREGIDO: Obtener imagen de terraza
  getTerrazaImage(terraza) {
    try {
      // Si hay fotos, usar la primera
      if (terraza.photos && terraza.photos.length > 0) {
        const primeraFoto = terraza.photos[0];
        return this.getImageUrl(primeraFoto);
      }
      
      // Imagen por defecto si no hay fotos
      return "https://images.unsplash.com/photo-1549294413-26f195200c16?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80";
      
    } catch (error) {
      console.error('❌ Error generando URL de imagen:', error);
      return "https://images.unsplash.com/photo-1549294413-26f195200c16?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80";
    }
  }

  // ✅ MÉTODO AUXILIAR: Generar URL completa para la imagen
  getImageUrl(photo) {
    if (!photo || !photo.filename) {
      return "https://images.unsplash.com/photo-1549294413-26f195200c16?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80";
    }
    
    // Si el filename ya es una URL completa, usarla
    if (photo.filename.startsWith('http')) {
      return photo.filename;
    }
    
    // Generar URL local - IMPORTANTE: Usar la ruta correcta
    const baseUrl = process.env.BASE_URL || 'http://localhost:4000';
    
    // Ruta: /uploads/images/filename.jpg
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

module.exports = PublicationRequestController;




// ------------------------------BIEEEEEEEEEEEEEEEEN