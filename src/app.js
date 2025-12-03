const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const path = require('path');
const imageService = require('./services/image.service');

// ================= IMPORTAR RUTAS (SIN DUPLICADOS) =================
const authRoutes = require('./routes/auth.routes');
const publicationRequestRoutes = require('./routes/publicationRequest.routes'); // ✅ SOLO UNA VEZ
const userRoutes = require('./routes/user.routes');
const documentVerificationRoutes = require('./routes/documentVerification.routes');
const terraceImagesRoutes = require('./routes/terraceImages.routes');
const adminRoutes = require('./routes/admin.routes');

// También importa las otras rutas que necesitas
const reservationRoutes = require('./routes/reservation.routes');
const commissionRoutes = require('./routes/commission.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const notificationRoutes = require('./routes/notification.routes');
const subscriptionPlanRoutes = require('./routes/SubscriptionPlan.route');
const calendarRoutes = require('./routes/calendar.routes');
// ===================================================================

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

// Inicializar GridFS cuando se conecte MongoDB
mongoose.connection.once('open', () => {
  imageService.initFromMongooseDb(mongoose.connection.db);
  console.log('✅ GridFS inicializado para almacenar archivos');
});

// Servir archivos estáticos
app.use('/uploads', express.static('uploads'));
app.use('/uploads/images', express.static('uploads/images'));

// Ruta de salud
app.get('/', (req, res) => res.json({ 
  ok: true, 
  name: 'TerraceRent API', 
  version: '1.0',
  message: '🚀 Servidor funcionando correctamente'
}));

// ================= REGISTRAR TODAS LAS RUTAS =================
app.use('/api/auth', authRoutes);
app.use('/api/publication-requests', publicationRequestRoutes); // ✅ SOLO UNA VEZ
app.use('/api/user', userRoutes);
app.use('/api/document-verification', documentVerificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/subscription-plans', subscriptionPlanRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/terrace-images', terraceImagesRoutes);

// Ruta de prueba adicional
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// CORREGIDO: Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    path: req.path,
    method: req.method,
    availableRoutes: [
      '/api/auth',
      '/api/publication-requests',
      '/api/user',
      '/api/document-verification',
      '/api/admin',
      '/api/reservations',
      '/api/health'
    ]
  });
});

// Manejo de errores global
app.use((error, req, res, next) => {
  console.error('🔥 Error global:', error);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

module.exports = app;