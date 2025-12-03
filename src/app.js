const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();

// ================= CONFIGURACIÓN CORS =================
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
};

app.use(cors(corsOptions));

// ================= MIDDLEWARES =================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ================= SERVIR ARCHIVOS ESTÁTICOS =================
app.use('/uploads', express.static('uploads'));

// ================= RUTA DE SALUD =================
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 TerraceRent API funcionando',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      user: '/api/user',
      documents: '/api/document-verification',
      terraces: '/api/publication-requests',
      admin: '/api/admin',
      health: '/api/health'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ================= CARGAR RUTAS =================
console.log('📡 Configurando rutas de la API...');

// Función para cargar rutas de forma segura
const loadRoute = (path, routeName, routeFile) => {
  try {
    const router = require(routeFile);
    app.use(path, router);
    console.log(`✅ ${routeName} cargada en ${path}`);
    return true;
  } catch (error) {
    console.warn(`⚠️  No se pudo cargar ${routeName}: ${error.message}`);
    return false;
  }
};

// Cargar rutas esenciales
loadRoute('/api/auth', 'Autenticación', './routes/auth.routes');
loadRoute('/api/user', 'Usuario', './routes/user.routes');
loadRoute('/api/document-verification', 'Verificación de documentos', './routes/documentVerification.routes');
loadRoute('/api/publication-requests', 'Publicación de terrazas', './routes/publicationRequest.routes');
loadRoute('/api/admin', 'Administración', './routes/admin.routes');
loadRoute('/api/reservations', 'Reservaciones', './routes/reservation.routes');
loadRoute('/api/terrace-images', 'Imágenes de terrazas', './routes/terraceImages.routes');

// Rutas opcionales (comentadas por ahora)
// loadRoute('/api/notifications', 'Notificaciones', './routes/notification.routes');
// loadRoute('/api/commissions', 'Comisiones', './routes/commission.routes');
loadRoute('/api/dashboard', 'Dashboard', './routes/dashboard.routes');
// loadRoute('/api/subscription-plans', 'Planes de suscripción', './routes/SubscriptionPlan.route');
// loadRoute('/api/calendar', 'Calendario', './routes/calendar.routes');

console.log('🎉 Configuración de rutas completada');

// ================= MANEJO DE ERRORES =================
// IMPORTANTE: No usar app.use('*', ...) directamente
// En su lugar, manejamos las rutas no encontradas al final

// Middleware para rutas no encontradas
app.use((req, res, next) => {
  // Si llegamos aquí, es porque ninguna ruta coincidió
  const error = new Error(`Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
});

// Error handler centralizado
app.use((error, req, res, next) => {
  console.error('🔥 Error:', error.message);
  
  const status = error.status || 500;
  const response = {
    success: false,
    message: error.message || 'Error interno del servidor',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  };
  
  // Solo en desarrollo mostrar detalles
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }
  
  res.status(status).json(response);
});

module.exports = app;