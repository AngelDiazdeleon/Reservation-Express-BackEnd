// src/app.js
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const path = require('path');
const imageService = require('./services/image.service');

// Importar rutas
const authRoutes = require('./routes/auth.routes');
const publicationRequestRoutes = require('./routes/publicationRequest.routes');
const userRoutes = require('./routes/user.routes');
const documentVerificationRoutes = require('./routes/documentVerification.routes');
const terraceImagesRoutes = require('./routes/terraceImages.routes');
const imageDebugRoutes = require('./routes/imageDebug.routes');
const reservationRoutes = require('./routes/reservation.routes'); // <- NUEVA

const app = express();

// Configurar CORS - PERMITE AMBOS PUERTOS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173', // <- Vite usa este puerto por defecto
  'http://localhost:8080'
];

app.use(cors({
  origin: function (origin, callback) {
    // Permite solicitudes sin origen (como apps móviles o curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'El origen CORS no está permitido.';
      console.log('Origen bloqueado:', origin);
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// SERVIR ARCHIVOS ESTÁTICOS
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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
app.use('/api/terrace-images', terraceImagesRoutes);
app.use('/api/debug', imageDebugRoutes);
app.use('/api/reservations', reservationRoutes); // <- NUEVA RUTA

// Inicializar GridFS cuando se conecte MongoDB
mongoose.connection.once('open', () => {
  imageService.initFromMongooseDb(mongoose.connection.db);
  console.log('✅ GridFS inicializado para almacenar archivos');
});

// Manejo de rutas no encontradas
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