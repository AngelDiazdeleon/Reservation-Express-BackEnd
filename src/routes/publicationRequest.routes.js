const express = require('express');
const router = express.Router();
const publicationUpload = require('../middleware/PublicationUpload');
const PublicationRequestController = require('../controllers/publicationRequest.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

const controller = new PublicationRequestController();

// 🔹 RUTAS PÚBLICAS (sin autenticación)
router.get('/public/approved', controller.getApprovedTerrazas);
router.get('/public/:id', controller.getTerrazaById);

// 🔹 RUTAS PARA HOSTS (requiere autenticación y rol host)
router.post(
  '/',
  requireAuth,
  requireRole('host'),
  publicationUpload,
  controller.create
);

router.get('/my/requests', 
  requireAuth, 
  requireRole('host'), 
  controller.getMyRequests
);

// 🔹 RUTAS PARA ADMINISTRADORES
// Listar todas las publicaciones (con filtros)
router.get('/', 
  requireAuth, 
  requireRole('admin'), 
  controller.list
);

// Obtener publicación específica
router.get('/:id', 
  requireAuth, 
  requireRole('admin'), 
  controller.getById
);

// Aprobar publicación
router.patch('/:id/approve', 
  requireAuth, 
  requireRole('admin'), 
  express.json(), 
  controller.approve
);

// Rechazar publicación
router.patch('/:id/reject', 
  requireAuth, 
  requireRole('admin'), 
  express.json(), 
  controller.reject
);

// ✅ NUEVA RUTA: Obtener terrazas pendientes para admin (con documentos)
router.get('/admin/pending', 
  requireAuth, 
  requireRole('admin'), 
  controller.getPendingForAdmin
);

// ✅ NUEVA RUTA: Obtener documentos de un usuario específico
router.get('/admin/user-documents/:userId', 
  requireAuth, 
  requireRole('admin'), 
  controller.getUserDocuments
);

module.exports = router;