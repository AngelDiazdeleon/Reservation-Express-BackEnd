// app.js
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const imageService = require('./services/image.service');

// Importar rutas

;

const authRoutes = require('./routes/auth.routes');
const publicationRequestRoutes = require('./routes/publicationRequest.routes');
const reservationRoutes = require('./routes/reservation.routes');
const userRoutes = require('./routes/user.routes');
const documentVerificationRoutes = require('./routes/documentVerification.routes');
// En app.js - AGREGAR ESTA LÍNEA
const terraceImagesRoutes = require('./routes/terraceImages.routes');
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Inicializar GridFS cuando se conecte MongoDB
mongoose.connection.once('open', () => {
  imageService.initFromMongooseDb(mongoose.connection.db);
  console.log('✅ GridFS inicializado para almacenar archivos');
});



// Ruta de salud
app.get('/', (req, res) => res.json({ 
  ok: true, 
  name: 'TerraceRent API', 
  version: '1.0',
  message: '🚀 Servidor funcionando correctamente'
}));

// Registrar rutas
app.use('/api/auth', authRoutes);
app.use('/api/publication-requests', publicationRequestRoutes);
app.use('/api/user', userRoutes);
app.use('/api/document-verification', documentVerificationRoutes);



// CORREGIDO: Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    path: req.path,
    method: req.method
  });
});

// Manejo de errores global
app.use((error, req, res, next) => {
  console.error('🔥 Error global:', error);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// En app.js, después de las otras rutas
app.use('/api/terrace-images', require('./routes/terraceImages.routes'));
app.use('/api/debug', require('./routes/imageDebug.routes'));
// Servir la carpeta uploads completa
app.use('/uploads', express.static('uploads'));

// ... después de otras rutas
app.use('/api/terrace-images', terraceImagesRoutes);



module.exports = app;