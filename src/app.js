const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const imageService = require('./services/image.service');

// Importar rutas
const terraceRoutes = require('./routes/terrace.routes');
const imageRoutes = require('./routes/image.routes');
const permissionRoutes = require('./routes/permission.routes');
const authRoutes = require('./routes/auth.routes');
const publicationRequestRoutes = require('./routes/publicationRequest.routes');
const adminRoutes = require('./routes/admin.routes');
const reservationRoutes = require('./routes/reservation.routes');
const userRoutes = require('./routes/user.routes');
const documentVerificationRoutes = require('./routes/documentVerification.routes');

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

// Servir archivos estáticos
app.use('/uploads', express.static('uploads'));

// Ruta de salud
app.get('/', (req, res) => res.json({ 
  ok: true, 
  name: 'TerraceRent API', 
  version: '1.0',
  message: '🚀 Servidor funcionando correctamente'
}));

// Registrar rutas
app.use('/api/auth', authRoutes);
app.use('/api/terraces', terraceRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/publication-requests', publicationRequestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/user', userRoutes);
app.use('/api/document-verification', documentVerificationRoutes);
app.use('/uploads', express.static('uploads'));
app.use('/api/images', express.static('uploads/images'));

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

module.exports = app;