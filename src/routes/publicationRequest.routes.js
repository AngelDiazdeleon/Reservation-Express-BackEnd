// En routes/publicationRequest.routes.js - AGREGAR ESTAS RUTAS
const express = require('express');
const router = express.Router();
const publicationUpload = require('../middleware/PublicationUpload');
const PublicationRequestController = require('../controllers/publicationRequest.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

const controller = new PublicationRequestController();

// Owner crea solicitud
router.post(
  '/',
  requireAuth,
  requireRole('host'),
  publicationUpload,
  controller.create
);

// Owner ve sus solicitudes
router.get('/my/requests', requireAuth, controller.getMyRequests);

// ✅ NUEVO: Clientes ven todas las terrazas aprobadas (sin autenticación)
router.get('/public/approved', controller.getApprovedTerrazas);

// ✅ NUEVO: Clientes ven terraza específica por ID (sin autenticación)
router.get('/public/:id', controller.getTerrazaById);

// Admin routes
router.get('/', requireAuth, requireRole('admin'), controller.list);
router.get('/:id', requireAuth, requireRole('admin'), controller.getById);
router.patch('/:id/approve', requireAuth, requireRole('admin'), express.json(), controller.approve);
router.patch('/:id/reject', requireAuth, requireRole('admin'), express.json(), controller.reject);

module.exports = router;